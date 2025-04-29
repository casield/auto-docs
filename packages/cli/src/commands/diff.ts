import ora from "ora";
import chalk from "chalk";
import { VersionControl } from "@auto-docs/core";
import { loadConfig } from "../utils/config";
import { displayChanges, displayAttributeChanges } from "../utils/interactive";

export async function diff(
  source: string,
  target: string,
  options: { config: string }
) {
  const spinner = ora("Loading configuration...").start();

  try {
    // Load configuration and create VersionControl
    const builder = loadConfig(options.config);
    spinner.text = "Setting up version control...";
    const versionControl = new VersionControl(builder.config.linker!);

    // Get differences between branches
    spinner.text = `Comparing branches: ${source} → ${target}`;
    const changes = await versionControl.getBranchDiff(source, target);
    spinner.succeed(`Found ${changes.length} change(s) between branches`);

    // Display changes
    displayChanges(changes);

    // If there are modified items, offer to show details
    const modifiedChanges = changes.filter((c) => c.status === "modified");

    if (modifiedChanges.length > 0) {
      console.log(chalk.blue("\nDetailed changes for modified documents:"));

      for (const change of modifiedChanges) {
        console.log(chalk.bold(`\n📄 Document: ${change.name}`));

        if (change.changes && change.changes.length > 0) {
          displayAttributeChanges(change.changes);
        } else {
          console.log(
            chalk.gray("No detailed changes available for this document.")
          );
        }
      }
    }
  } catch (error) {
    spinner.fail("Comparison failed");
    console.error(
      chalk.red(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
