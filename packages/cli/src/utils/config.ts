import fs from "fs";
import path from "path";
import { LambdaDocsBuilder, Linker } from "@auto-docs/core";
import { MemoryLinker } from "@auto-docs/core";
import { DynamicProxyLinker } from "@auto-docs/serverless-dynamic";

interface CliConfig {
  name: string;
  description: string;
  linkerRoute?: string;
  outputDir?: string;
  version?: string;
}

export function loadConfig(configPath: string) {
  // Try to find the config file
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found at ${resolvedPath}`);
  }

  // Load and parse the config
  const configContent = fs.readFileSync(resolvedPath, "utf-8");
  const config: CliConfig = JSON.parse(configContent);

  if (!config.name || !config.description) {
    throw new Error("Invalid configuration: name and description are required");
  }

  // Create a linker based on config
  let linker: any;
  if (config.linkerRoute) {
    linker = new DynamicProxyLinker(config.linkerRoute);
  } else {
    // Default to memory linker
    linker = new MemoryLinker();
  }

  // Create and return a builder
  return new LambdaDocsBuilder({
    name: config.name,
    description: config.description,
    pluginConfig: {
      openApi: {
        outputDir: config.outputDir || "docs",
        version: config.version || "1.0.0",
      },
    },
    linker,
    plugins: [],
  });
}
