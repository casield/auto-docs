import fs from "fs";
import path from "path";
import { AutoDocsBuilder, Linker } from "@auto-docs/core";
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
 * Loads a configuration file and returns a AutoDocsBuilder
 * Supports both JSON and TypeScript files
 *
 * @param configPath Path to the configuration file
 * @returns A AutoDocsBuilder instance
 */
export function loadConfig(
  configPath: string
): AutoDocsBuilder<AutoDocsTypes.AvailablePlugins> {
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
 * Loads a JSON configuration file and creates a AutoDocsBuilder
 *
 * @param configPath Path to the JSON configuration file
 * @returns A AutoDocsBuilder instance
 */
function loadJsonConfig(
  configPath: string
): AutoDocsBuilder<AutoDocsTypes.AvailablePlugins> {
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
  return new AutoDocsBuilder({
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
 * @returns A AutoDocsBuilder instance
 */
function loadTsConfig(
  configPath: string
): AutoDocsBuilder<AutoDocsTypes.AvailablePlugins> {
  try {
    // Disable source-map-support explicitly
    process.env.TS_NODE_SKIP_SOURCE_MAP_SUPPORT = "true";

    // Instead of using register, which can cause issues with source-map-support,
    // use a more direct approach for Node.js to handle TypeScript files
    if (!process.execArgv.some((arg) => arg.startsWith("--require"))) {
      try {
        // Try to load the TypeScript file directly using Node's require
        const configModule = require(configPath);

        // Process the loaded module
        return processConfigModule(configModule);
      } catch (directRequireError) {
        console.warn(
          "Direct require failed, attempting ts-node as fallback..."
        );
        // If direct require fails, try with minimal ts-node options
        try {
          // Try with absolute minimal registration
          register({
            transpileOnly: true,
            skipProject: true,
            compilerOptions: {
              allowJs: true,
              esModuleInterop: true,
            },
          });

          // Clear cache and load
          delete require.cache[require.resolve(configPath)];
          const configModule = require(configPath);

          return processConfigModule(configModule);
        } catch (tsNodeError) {
          console.error("Failed to load with ts-node:", tsNodeError);
          throw new Error(`Cannot load TypeScript config: ${tsNodeError}`);
        }
      }
    } else {
      // If we're already running with ts-node (or similar), just require directly
      const configModule = require(configPath);
      return processConfigModule(configModule);
    }
  } catch (error) {
    console.error("Error loading TypeScript config:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to load TypeScript config: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Process a loaded configuration module to extract the AutoDocsBuilder
 *
 * @param configModule The loaded module
 * @returns AutoDocsBuilder instance
 */
function processConfigModule(
  configModule: any
): AutoDocsBuilder<AutoDocsTypes.AvailablePlugins> {
  // Check if the module exports a AutoDocsBuilder instance
  if (configModule.default && configModule.default instanceof AutoDocsBuilder) {
    return configModule.default;
  }

  // Check if the module directly exports a AutoDocsBuilder
  if (configModule instanceof AutoDocsBuilder) {
    return configModule as AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>;
  }

  // Check if there's a createBuilder function
  if (typeof configModule.createBuilder === "function") {
    const builder = configModule.createBuilder();
    if (builder instanceof AutoDocsBuilder) {
      return builder as AutoDocsBuilder<AutoDocsTypes.AvailablePlugins>;
    }
  }

  // If we have data but not a builder, try to construct one
  if (configModule.name && configModule.description) {
    throw new Error("Invalid configuration: name and description are required");
  }

  throw new Error(
    `TypeScript config file must export a AutoDocsBuilder instance, but got ${typeof configModule}`
  );
}
