import chalk from "chalk";
import ora from "ora";
import { loadConfig } from "../utils/config";

export const run = async (options: { config: string }) => {
  const config = loadConfig(options.config);
  const spinner = ora("Running Auto-Docs...").start();
  try {
    await config.run();
    spinner.succeed("Auto-Docs run completed successfully");
  } catch (error) {
    spinner.fail("Auto-Docs run failed");
    console.error(
      chalk.red(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
      ),
      error
    );
    process.exit(1);
  } finally {
    spinner.stop();
  }
  console.log(chalk.green("Auto-Docs run completed successfully"));
};
