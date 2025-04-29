#!/usr/bin/env node

import { program } from "commander";
import { merge } from "./commands/merge";
import { listBranches } from "./commands/list-branches";
import { diff } from "./commands/diff";
import { version } from "../package.json";

// Set up the program
program
  .name("auto-docs")
  .description("Interactive CLI for Auto-Docs to manage documentation")
  .version(version);

// Register commands
program
  .command("merge")
  .description("Interactively merge changes between branches")
  .argument("<source>", "Source branch")
  .argument("<target>", "Target branch")
  .option(
    "-c, --config <path>",
    "Path to the auto-docs configuration file",
    ".auto-docs.json"
  )
  .action(merge);

program
  .command("diff")
  .description("Show differences between branches")
  .argument("<source>", "Source branch")
  .argument("<target>", "Target branch")
  .option(
    "-c, --config <path>",
    "Path to the auto-docs configuration file",
    ".auto-docs.json"
  )
  .action(diff);

program
  .command("list-branches")
  .description("List all available branches")
  .option(
    "-c, --config <path>",
    "Path to the auto-docs configuration file",
    ".auto-docs.json"
  )
  .action(listBranches);

// Parse arguments
program.parse(process.argv);
