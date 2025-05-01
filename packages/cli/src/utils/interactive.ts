import chalk from "chalk";
import inquirer from "inquirer";
import { table } from "table";
import { DocumentChange, AttributeChange } from "@auto-docs/core";

/**
 * Displays a formatted table showing the details of document changes
 */
export function displayChanges<T extends keyof AutoDocsTypes.Plugins>(
  changes: DocumentChange<T>[]
) {
  // Group by status
  const added = changes.filter((c) => c.status === "added");
  const removed = changes.filter((c) => c.status === "removed");
  const modified = changes.filter((c) => c.status === "modified");

  console.log(chalk.bold("\n🔍 Changes Summary:"));
  console.log(chalk.green(`Added: ${added.length}`));
  console.log(chalk.red(`Removed: ${removed.length}`));
  console.log(chalk.yellow(`Modified: ${modified.length}`));

  if (changes.length === 0) {
    console.log(chalk.gray("\nNo changes detected between branches."));
    return;
  }

  // Display table with details
  const tableData = [
    [chalk.bold("Status"), chalk.bold("Name"), chalk.bold("Details")],
  ];

  for (const change of changes) {
    const statusColor =
      change.status === "added"
        ? chalk.green
        : change.status === "removed"
        ? chalk.red
        : chalk.yellow;

    let details = "";
    if (change.status === "modified" && change.changes) {
      details = `${change.changes.length} attribute changes`;
    } else if (change.status === "added" && change.objectB) {
      details = `Version: ${change.objectB.version}`;
    } else if (change.status === "removed" && change.objectA) {
      details = `Version: ${change.objectA.version}`;
    }

    tableData.push([statusColor(change.status), change.name, details]);
  }

  console.log(table(tableData));
}

/**
 * Displays a formatted view of attribute changes for a specific document
 */
export function displayAttributeChanges(attributeChanges: AttributeChange[]) {
  console.log(chalk.bold("\n📊 Attribute Changes:"));

  if (attributeChanges.length === 0) {
    console.log(chalk.gray("No attribute changes to display."));
    return;
  }

  const tableData = [
    [chalk.bold("Path"), chalk.bold("Old Value"), chalk.bold("New Value")],
  ];

  for (const change of attributeChanges) {
    tableData.push([
      chalk.blue(change.path),
      formatValue(change.oldValue),
      formatValue(change.newValue),
    ]);
  }

  console.log(table(tableData));
}

/**
 * Formats a value for display in the console
 */
function formatValue(value: any): string {
  if (value === undefined) return chalk.italic("undefined");
  if (value === null) return chalk.italic("null");

  if (typeof value === "object") {
    return chalk.gray(
      JSON.stringify(value, null, 2).substring(0, 50) +
        (JSON.stringify(value).length > 50 ? "..." : "")
    );
  }

  return String(value);
}

/**
 * Prompts the user to select changes they want to apply
 */
export async function promptForChanges<T extends keyof AutoDocsTypes.Plugins>(
  changes: DocumentChange<T>[]
): Promise<DocumentChange<T>[]> {
  if (changes.length === 0) {
    return [];
  }

  // First, ask if user wants to apply all changes
  const { applyAll } = await inquirer.prompt([
    {
      type: "confirm",
      name: "applyAll",
      message: "Apply all changes?",
      default: false,
    },
  ]);

  if (applyAll) {
    return changes;
  }

  // Otherwise, let user select which changes to apply
  const { selectedChanges } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedChanges",
      message: "Select changes to apply:",
      choices: changes.map((change, index) => ({
        name: `[${change.status}] ${change.name}`,
        value: index,
        checked: change.status === "added", // Pre-check added items by default
      })),
    },
  ]);

  return selectedChanges.map((index: number) => changes[index]);
}

/**
 * For modified items, allow user to select specific attribute changes to apply
 */
export async function promptForAttributeChanges<
  T extends keyof AutoDocsTypes.Plugins
>(change: DocumentChange<T>): Promise<AttributeChange[]> {
  if (!change.changes || change.changes.length === 0) {
    return [];
  }

  // Display the attribute changes
  displayAttributeChanges(change.changes);

  // Ask if user wants to apply all attribute changes
  const { applyAllAttributes } = await inquirer.prompt([
    {
      type: "confirm",
      name: "applyAllAttributes",
      message: "Apply all attribute changes?",
      default: true,
    },
  ]);

  if (applyAllAttributes) {
    return change.changes;
  }

  // Otherwise, let user select which attribute changes to apply
  const { selectedAttributes } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedAttributes",
      message: "Select attribute changes to apply:",
      choices: change.changes.map((attrChange, index) => ({
        name: `${attrChange.path}: ${formatValue(
          attrChange.oldValue
        )} → ${formatValue(attrChange.newValue)}`,
        value: index,
        checked: true,
      })),
    },
  ]);

  return selectedAttributes.map((index: number) => change.changes![index]);
}
