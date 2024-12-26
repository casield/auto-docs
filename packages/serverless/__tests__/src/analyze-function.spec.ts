// LambdaFunctionAnalyzer.test.ts

import AdmZip from "adm-zip";
import * as path from "path";
import { writeFileSync, unlinkSync } from "fs";
import Serverless from "serverless";
import { LambdaFunctionAnalyzer } from "../../src/analyze-function-v2";

describe("LambdaFunctionAnalyzer", () => {
  const TEST_ZIP_FILE = path.join(__dirname, "test-artifact.zip");

  beforeAll(() => {
    /**
     * 1. Create an in-memory ZIP using adm-zip
     * 2. Write some test JS files to it:
     *    - `functions/hello.js`: Exports a handler that returns a call to `otherFunction()`
     *    - `functions/other.js`: Exports `otherFunction` that returns a string
     */
    const zip = new AdmZip();

    // File 1: "functions/hello.js"
    // A simple handler that calls otherFunction()
    const helloJs = `
      import { otherFunction } from "./other";

      export function handler() {
        return otherFunction();
      }
    `;
    zip.addFile("functions/hello.js", Buffer.from(helloJs, "utf8"));

    // File 2: "functions/other.js"
    // A function that returns a string
    const otherJs = `
      export function otherFunction() {
        return "Hello from otherFunction";
      }
    `;
    zip.addFile("functions/other.js", Buffer.from(otherJs, "utf8"));

    // Write the ZIP to disk so we can pass its path to LambdaFunctionAnalyzer
    zip.writeZip(TEST_ZIP_FILE);
  });

  afterAll(() => {
    // Clean up the ZIP file
    unlinkSync(TEST_ZIP_FILE);
  });

  it("should parse a simple function and build the correct call graph", () => {
    // Our "serverless" function config: handler = "functions/hello.handler"
    const fn: Serverless.FunctionDefinitionHandler = {
      handler: "functions/hello.handler",
      name: "handler",
      events: [],
    };

    // Instantiate the analyzer with our test artifact
    const analyzer = new LambdaFunctionAnalyzer(TEST_ZIP_FILE);

    // Analyze the function
    const result = analyzer.analyzeFunction(fn);

    /**
     * The result is a NodeReturn structure, e.g.:
     * {
     *   type: "call",
     *   value: "handler",
     *   children: [
     *     {
     *       type: "call",
     *       value: "otherFunction",
     *       relatedFunction: "otherFunction",
     *       children: [
     *         {
     *           type: "unknown",
     *           value: "\"Hello from otherFunction\""
     *         }
     *       ]
     *     }
     *   ]
     * }
     */

    // Check top-level node
    expect(result.type).toBe("call");
    expect(result.value).toBe("handler");
    expect(result.children).toHaveLength(1);

    // Child node should reference 'otherFunction'
    const childNode = result.children![0];
    expect(childNode.type).toBe("call");
    expect(childNode.value).toBe("otherFunction()");
    expect(childNode.relatedFunction).toBe("otherFunction");
    expect(childNode.children).toHaveLength(1);

    // Next child: return statement in otherFunction is a direct string -> type "unknown"
    const grandChildNode = childNode.children![0];
    expect(grandChildNode.type).toBe("call");
    expect(grandChildNode.value).toBe("otherFunction");

    const grandChildNode2 = grandChildNode.children![0];
    expect(grandChildNode2.type).toBe("unknown");
    expect(grandChildNode2.value).toBe('"Hello from otherFunction"');
  });

  it("should handle non-existent files gracefully", () => {
    const analyzer = new LambdaFunctionAnalyzer(TEST_ZIP_FILE);

    // A function definition that points to a file that doesn't exist
    const fn: Serverless.FunctionDefinitionHandler = {
      handler: "functions/missingFile.handler", // This file doesn't exist in the ZIP
      name: "missingFunction",
      events: [],
    };

    // We expect an error to be thrown
    expect(() => analyzer.analyzeFunction(fn)).toThrow(
      "File functions/missingFile.js not found in the artifact."
    );
  });
});
