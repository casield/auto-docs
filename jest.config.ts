import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  verbose: true,
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  projects: [
    {
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
      preset: "ts-jest",
      displayName: "serverless",
      testMatch: ["<rootDir>/packages/serverless/__tests__/**/*.spec.ts"],
    },
    {
      testPathIgnorePatterns: ["<rootDir>/node_modules/"],
      preset: "ts-jest",
      displayName: "core",
      testMatch: ["<rootDir>/packages/core/src/__test__/**/*.test.ts"],
    },
  ],
};
export default config;
