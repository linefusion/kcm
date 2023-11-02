import main from "@kcm/cmd/main.ts";
import merge from "@kcm/cmd/merge.ts";

const bootstrap = main;

main.command("merge", merge);

export default bootstrap;

if (import.meta.main) {
  await bootstrap.parse(Deno.args);
}
