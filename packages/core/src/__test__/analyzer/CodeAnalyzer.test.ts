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

    export const testFunction = () => {
      return myFunction();
    }

    export class TestClass {
      public testMethod() {
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
    expect(analysis.returnStatements).toBeDefined();
  });
});
