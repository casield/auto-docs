import ora from "ora";
import chalk from "chalk";
import { table } from "table";
import { loadConfig } from "../utils/config.js";

export async function listBranches(options: { config: string }) {
  const spinner = ora("Loading configuration...").start();

  try {
    // Load configuration
    const builder = loadConfig(options.config);
    spinner.text = "Fetching branches...";

    // Pull data to get all branches
    const data = await builder.config.linker!.pull();

    spinner.succeed("Branches retrieved successfully");

    // Extract unique branch names
    const branches = new Set<string>();

    // Iterate the data to count documents per branch
    const docCounts: Record<string, number> = {};

    Object.entries(data).forEach(([pluginName, documents]) => {
      documents.forEach((doc) => {
        branches.add(doc.branch);
        docCounts[doc.branch] = (docCounts[doc.branch] || 0) + 1;
      });
    });

    if (branches.size === 0) {
      console.log(chalk.yellow("\nNo branches found."));
      return;
    }

    // Display branches in a table
    console.log(chalk.bold("\n🌿 Available Branches:"));

    const tableData = [
      [chalk.bold("Branch Name"), chalk.bold("Document Count")],
    ];

    Array.from(branches)
      .sort()
      .forEach((branch) => {
        tableData.push([branch, docCounts[branch].toString()]);
      });

    console.log(table(tableData));
  } catch (error) {
    spinner.fail("Failed to retrieve branches");
    console.error(
      chalk.red(
        `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    process.exit(1);
  }
}
