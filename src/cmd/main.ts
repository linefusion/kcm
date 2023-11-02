import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";

const command = new Command()
  .name("kcm")
  .version("0.1")
  .description("Kubeconfig Manager")
  .action(function () {
    this.showHelp();
  });

export default command;
