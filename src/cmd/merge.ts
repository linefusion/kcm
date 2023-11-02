import figlet from "https://deno.land/x/deno_figlet@1.0.0/mod.ts";

import { Command } from "@cliffy/command/mod.ts";
import { Input, Confirm } from "@cliffy/prompt/mod.ts";

import * as fs from "@std/fs/mod.ts";
import * as yaml from "@std/yaml/mod.ts";
import * as ansi from "@cliffy/ansi/mod.ts";
import * as options from "@kcm/utils/options.ts";

import {
  KubeConfig,
  findKubeConfigFiles,
  loadKubeConfigFiles,
} from "@kcm/lib/kubeconfig.ts";
import { expandHomeDir } from "@kcm/utils/home.ts";

const command = new Command()
  .name("merge")
  .description("Merge kubeconfigs")
  .option("--load <path:string[]>", "Kubeconfigs to load.", {
    collect: true,
    default: [".", "~/.kube/config"],
    value(value, previous?: string[]) {
      const home = options.toPath(expandHomeDir("~/.kube/config"));
      const values = options.toArray(value, previous).map(options.toPath);
      if (!values.find((value) => value == home)) {
        values.push(home);
      }
      return values;
    },
  })
  .option("--save <path:string>", "Save merged kubeconfig to file", {
    default: "~/.kube/config",
    value(value) {
      return options.toPath(value);
    },
  })
  .action(async function (options) {
    const files = await findKubeConfigFiles(options.load);
    const configs = await loadKubeConfigFiles(files);

    let hasConflicts = true;
    while (hasConflicts) {
      hasConflicts = false;

      ansi.tty.cursorTo(0, 0).eraseScreen();

      const contexts = configs.flatMap((config) => {
        return config.config.contexts.map((context) => ({
          file: config.file,
          context: context,
          config: config.config,
        }));
      });

      for (const current of contexts) {
        const duplicates = contexts.filter(
          (context) => context.context.name === current.context.name
        );

        if (duplicates.length == 1) {
          continue;
        }

        hasConflicts = true;

        console.log(ansi.colors.blue(await figlet("CONTEXTS")));

        console.log(
          ansi.colors.red(
            `Error: context name ${ansi.colors.bgRed.black(
              current.context.name
            )} found multiple times.`
          )
        );

        for (const duplicate of duplicates) {
          const rename = await Input.prompt({
            message: `What name should context "${duplicate.context.name}" in "${duplicate.file}" be?`,
            default: duplicate.context.name,
          });

          if (duplicate.config["current-context"] == duplicate.context.name) {
            duplicate.config["current-context"] = rename;
          }

          duplicate.context.name = rename;
        }
      }

      const users = configs.flatMap((config) => {
        return config.config.users.map((user) => ({
          file: config.file,
          user: user,
          config: config.config,
        }));
      });

      for (const current of users) {
        const duplicates = users.filter(
          (context) => context.user.name === current.user.name
        );

        if (duplicates.length == 1) {
          continue;
        }

        hasConflicts = true;

        console.log(ansi.colors.blue(await figlet("USERS")));

        console.log(
          ansi.colors.red(
            `Error: user name ${ansi.colors.bgRed.black(
              current.user.name
            )} found multiple times.`
          )
        );

        for (const duplicate of duplicates) {
          const rename = await Input.prompt({
            message: `What name should user "${duplicate.user.name}" in "${duplicate.file}" be?`,
            default: duplicate.user.name,
          });

          for (const context of duplicate.config.contexts) {
            if (context.context.user == duplicate.user.name) {
              context.context.user = rename;
            }
          }

          duplicate.user.name = rename;
        }
      }

      const clusters = configs.flatMap((config) => {
        return config.config.clusters.map((cluster) => ({
          file: config.file,
          cluster: cluster,
          config: config.config,
        }));
      });

      for (const current of clusters) {
        const duplicates = clusters.filter(
          (context) => context.cluster.name === current.cluster.name
        );

        if (duplicates.length == 1) {
          continue;
        }

        hasConflicts = true;

        console.log(ansi.colors.blue(await figlet("CLUSTERS")));

        console.log(
          ansi.colors.red(
            `Error: cluster name ${ansi.colors.bgRed.black(
              current.cluster.name
            )} found multiple times.`
          )
        );

        for (const duplicate of duplicates) {
          const rename = await Input.prompt({
            message: `What name should cluster "${duplicate.cluster.name}" in "${duplicate.file}" be?`,
            default: duplicate.cluster.name,
          });

          for (const context of duplicate.config.contexts) {
            if (context.context.cluster == duplicate.cluster.name) {
              context.context.cluster = rename;
            }
          }

          duplicate.cluster.name = rename;
        }
      }
    }

    const finalConfig = configs.reduce(
      (config, current) => {
        config.clusters.push(...current.config.clusters);
        config.contexts.push(...current.config.contexts);
        config.users.push(...current.config.users);
        return config;
      },
      <KubeConfig>{
        apiVersion: "v1",
        kind: "Config",
        clusters: [],
        contexts: [],
        users: [],
      }
    );

    const save = await Confirm.prompt({
      message: "Save merged kubeconfig to file?",
      hint: `File: ${options.save}`,
    });

    if (save) {
      if (await fs.exists(options.save)) {
        await fs.copy(options.save, `${options.save}.bak-${Date.now()}`);
      }
      await Deno.writeTextFile(options.save, yaml.stringify(finalConfig));
    }
  });

export default command;
