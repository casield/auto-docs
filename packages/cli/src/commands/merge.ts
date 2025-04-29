import ora from "ora";
import chalk from "chalk";
import { VersionControl } from "@auto-docs/core";
import { loadConfig } from "../utils/config.js";
import {
  displayChanges,
  promptForChanges,
  promptForAttributeChanges,
} from "../utils/interactive.js";

export async function merge<T extends keyof AutoDocsTypes.Plugins>(
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
    spinner.succeed(`Detected ${changes.length} change(s) between branches`);

    // Display changes and get user selection
    displayChanges(changes);

    if (changes.length === 0) {
      console.log(chalk.blue("\nNo changes to merge."));
      return;
    }

    // Let user select which changes to apply
    const selectedChanges = await promptForChanges(changes);

    if (selectedChanges.length === 0) {
      console.log(chalk.yellow("\nNo changes selected for merging."));
      return;
    }

    // Process the selected changes
    spinner.text = "Merging changes...";
    spinner.start();

    const mergeResults = await versionControl.merge(
      source,
      target,
      async (change) => {
        if (!change) {
          return null; // Skip if change is null
        }
        // This is our custom conflict resolution function that handles user interaction
        if (
          change.status === "modified" &&
          change.objectA &&
          change.objectB &&
          change.changes
        ) {
          // For modified items, let the user choose which attributes to merge
          spinner.stop();
          console.log(chalk.bold(`\n📄 Processing document: ${change.name}`));

          // If this change wasn't selected by the user, skip it
          if (
            !selectedChanges.some(
              (c) => c.name === change.name && c.status === change.status
            )
          ) {
            return null; // Skip this change
          }

          // Let user decide which attribute changes to apply
          const selectedAttributes = await promptForAttributeChanges(change);

          if (selectedAttributes.length === 0) {
            console.log(
              chalk.yellow(
                "No attributes selected for this document. Skipping."
              )
            );
            return null;
          }

          // Apply only selected attribute changes
          const modifiedDocument: AutoDocsTypes.LinkerObject<T> = {
            ...change.objectA,
          };

          // Create a copy of objectA's data as base
          modifiedDocument.data = JSON.parse(
            JSON.stringify(change.objectA.data)
          );

          // Apply each selected attribute change
          for (const attrChange of selectedAttributes) {
            // Using the applyChanges helper function to apply each selected change
            modifiedDocument.data = versionControl.applyChanges(
              modifiedDocument.data,
              [attrChange]
            );
          }

          // Update the branch to target
          modifiedDocument.branch = target;

          spinner.start();
          return modifiedDocument;
        }

        // For added items, simply copy to target branch if selected
        if (change.status === "added" && change.objectB) {
          if (
            selectedChanges.some(
              (c) => c.name === change.name && c.status === change.status
            )
          ) {
            return { ...change.objectB, branch: target };
          }
          return null; // Skip if not selected
        }

        // For removed items, don't do anything if selected
        if (change.status === "removed") {
          // We don't actually delete anything in this interactive mode
          // Just log that we're skipping this
          return null;
        }

        return null; // Default: skip change
      }
    );

    spinner.succeed("Merge completed successfully");

    // Show merge results
    console.log(chalk.bold("\n📊 Merge Results:"));
    console.log(chalk.green(`Merged: ${mergeResults.merged}`));
    console.log(chalk.yellow(`Skipped: ${mergeResults.skipped}`));
    console.log(chalk.red(`Conflicts: ${mergeResults.conflicts}`));
  } catch (error) {
    spinner.fail("Merge failed");
    console.error(
      chalk.red(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
