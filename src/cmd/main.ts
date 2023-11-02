import { Command } from "@cliffy/command/mod.ts";

const command = new Command()
  .name("kcm")
  .version("0.1")
  .description("Kubeconfig Manager")
  .action(function () {
    this.showHelp();
  });

export default command;
