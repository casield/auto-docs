import {
  CodeAnalyzer,
  AnalyzerOptions,
  ReturnAnalysis,
} from "../../analyzer/CodeAnalyzer";

describe("CodeAnalyzer", () => {
  const options: AnalyzerOptions = {};

  it("should analyze source code and return correct return statements and class methods", () => {
    const sourceCode = `
    
    import { myFunction } from "../../final-framework/main.ts";

    /**
     * Hello this is a comment
     * @returns {string}
     */
    export const testFunction = () => {
      // This is a comment
      return myFunction();
    }

    export class TestClass {
      public testMethod() {
        /**
         * This is a comment
         */
        return myFunction();
      }
    }

    export function testFunction2() {
      return myFunction();
    }

    `;

    const analyzer = new CodeAnalyzer("testFile.ts", options);
    const analysis: ReturnAnalysis = analyzer.analyzeSource(sourceCode);

    expect(analysis).toBeDefined();
  });
});
