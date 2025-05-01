#!/usr/bin/env node

import { program } from "commander";
import { merge } from "./commands/merge";
import { listBranches } from "./commands/list-branches";
import { diff } from "./commands/diff";
import { run } from "./commands/run";
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
  .alias("branches")
  .alias("ls")
  .description("List all available branches")
  .option(
    "-c, --config <path>",
    "Path to the auto-docs configuration file",
    ".auto-docs.json"
  )
  .action(listBranches);

program
  .command("run")
  .description("Load a configuration file and run the documentation builder")
  .option(
    "-c, --config <path>",
    "Path to the auto-docs configuration file",
    ".auto-docs.json"
  )
  .action(run);

// Parse arguments
program.parse(process.argv);
