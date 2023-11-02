export function getHomeDir(): string {
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
  if (!homeDir) {
    throw new Error("Could not determine home directory.");
  }
  return homeDir;
}

export function expandHomeDir(path: string): string {
  return path.replace(/^~(?=$|\/|\\)/, getHomeDir());
}
