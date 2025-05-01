import fs from "fs";
import path from "path";
import { LambdaDocsBuilder, Linker } from "@auto-docs/core";
import { MemoryLinker } from "@auto-docs/core";
import { DynamicProxyLinker } from "@auto-docs/serverless-dynamic";
import { register } from "ts-node";

interface CliConfig {
  name: string;
  description: string;
  linkerRoute?: string;
  outputDir?: string;
  version?: string;
}

/**
 * Loads a configuration file and returns a LambdaDocsBuilder
 * Supports both JSON and TypeScript files
 *
 * @param configPath Path to the configuration file
 * @returns A LambdaDocsBuilder instance
 */
export function loadConfig(
  configPath: string
): LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins> {
  // Try to find the config file
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found at ${resolvedPath}`);
  }

  // Check file extension to determine loading method
  const fileExt = path.extname(resolvedPath).toLowerCase();

  if (fileExt === ".ts" || fileExt === ".js") {
    console.log("Loading TypeScript config...");
    return loadTsConfig(resolvedPath);
  } else {
    // Default to JSON loading
    return loadJsonConfig(resolvedPath);
  }
}

/**
 * Loads a JSON configuration file and creates a LambdaDocsBuilder
 *
 * @param configPath Path to the JSON configuration file
 * @returns A LambdaDocsBuilder instance
 */
function loadJsonConfig(
  configPath: string
): LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins> {
  // Load and parse the JSON config
  const configContent = fs.readFileSync(configPath, "utf-8");
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
    linker,
    plugins: [],
    branch: "main",
  });
}

/**
 * Loads and executes a TypeScript configuration file
 *
 * @param configPath Path to the TypeScript configuration file
 * @returns A LambdaDocsBuilder instance
 */
function loadTsConfig(
  configPath: string
): LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins> {
  try {
    // Register TypeScript compiler with more permissive settings
    register({
      transpileOnly: true, // Skip type checking for better performance
      compilerOptions: {
        module: "NodeNext",
        esModuleInterop: true,
        noImplicitAny: false, // Allow implicit any to avoid compilation errors
        skipLibCheck: true,
      },
    });

    // Clear the require cache to ensure we get fresh modules
    delete require.cache[require.resolve(configPath)];

    // Require the TypeScript file
    const configModule = require(configPath);

    // Check if the module exports a LambdaDocsBuilder instance
    if (
      configModule.default &&
      configModule.default instanceof LambdaDocsBuilder
    ) {
      return configModule.default;
    }

    // Check if the module directly exports a LambdaDocsBuilder
    if (configModule instanceof LambdaDocsBuilder) {
      return configModule as LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>;
    }

    // Check if there's a createBuilder function
    if (typeof configModule.createBuilder === "function") {
      const builder = configModule.createBuilder();
      if (builder instanceof LambdaDocsBuilder) {
        return builder as LambdaDocsBuilder<AutoDocsTypes.AvailablePlugins>;
      }
    }

    throw new Error(
      `TypeScript config file must export a LambdaDocsBuilder instance, but got ${typeof configModule}`
    );
  } catch (error) {
    console.error("Error loading TypeScript config:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to load TypeScript config: ${error.message}`);
    }
    throw error;
  }
}
