import * as fs from "https://deno.land/std@0.204.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.204.0/path/mod.ts";
import * as yaml from "https://deno.land/std@0.204.0/yaml/mod.ts";

import { expandGlob } from "https://deno.land/std@0.204.0/fs/mod.ts";

import { z } from "npm:/zod@3.6.0";

export const KubeClusterSchema = z
  .object({
    name: z.string(),
    cluster: z
      .object({
        server: z.string(),
        "certificate-authority-data": z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const KubeUserSchema = z
  .object({
    name: z.string(),
    user: z
      .object({
        "client-certificate-data": z.string().optional(),
        "client-key-data": z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

export const KubeContextSchema = z
  .object({
    name: z.string(),
    context: z
      .object({
        cluster: z.string(),
        user: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export const KubePreferences = z.object({}).passthrough();

export const KubeConfigSchema = z
  .object({
    apiVersion: z.literal("v1"),
    kind: z.literal("Config"),
    users: z.array(KubeUserSchema),
    clusters: z.array(KubeClusterSchema),
    contexts: z.array(KubeContextSchema),
    preferences: KubePreferences.optional(),
    "current-context": z.string().optional(),
  })
  .passthrough();

export type KubeConfig = z.infer<typeof KubeConfigSchema>;

export async function isKubeConfig(filename: string) {
  const contents = new TextDecoder().decode(await Deno.readFile(filename));
  const data = yaml.parse(contents, {
    filename: filename,
    json: true,
  });

  return (await KubeConfigSchema.safeParseAsync(data)).success;
}

export async function findKubeConfigFiles(
  location: string | string[]
): Promise<string[]> {
  const files: string[] = [];
  if (Array.isArray(location)) {
    for (const loc of location) {
      files.push(...(await findKubeConfigFiles(loc)));
    }
    return files;
  }

  if ((await fs.exists(location)) && (await Deno.stat(location)).isFile) {
    if (await isKubeConfig(location)) {
      files.push(location);
    }
    return files;
  }

  const root = path.isAbsolute(location) ? location : Deno.cwd();
  const glob = path.join(
    path.isAbsolute(location) ? "." : location,
    "**/*.{yml,yaml}"
  );

  for await (const file of expandGlob(glob, {
    root,
    extended: true,
    caseInsensitive: true,
    includeDirs: false,
  })) {
    if (!file.isFile) {
      continue;
    }

    if (!(await isKubeConfig(file.path))) {
      continue;
    }

    files.push(file.path);
  }

  return files;
}

export async function loadKubeConfigFile(
  location: string
): Promise<KubeConfig> {
  if (!(await isKubeConfig(location))) {
    throw new Error(`File "${location}" is not a valid kubeconfig file.`);
  }

  const contents = await Deno.readTextFile(location);
  const data = yaml.parse(contents, {
    filename: location,
    json: true,
  });

  const result = await KubeConfigSchema.safeParseAsync(data);
  if (!result.success) {
    throw new Error(
      `File "${location}" is not a valid kubeconfig file. ${result.error.message}`
    );
  }

  return result.data;
}

export async function loadKubeConfigFiles(
  locations: string | string[]
): Promise<{ file: string; config: KubeConfig }[]> {
  if (!Array.isArray(locations)) {
    locations = [locations];
  }

  return await Promise.all(
    locations.map(async (location) => ({
      file: location,
      config: await loadKubeConfigFile(location),
    }))
  );
}
