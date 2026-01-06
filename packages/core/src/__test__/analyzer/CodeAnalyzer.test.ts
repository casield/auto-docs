import {
  CodeAnalyzer,
  AnalyzerOptions,
  ReturnAnalysis,
} from "../../analyzer/CodeAnalyzer";
import { parseComment } from "../../utils";

describe("CodeAnalyzer", () => {
  const options: AnalyzerOptions = {};

  it("should analyze source code and return correct return statements and class methods", () => {
    const sourceCode = `
    import { myFunction } from "../../final-framework/main.ts";

    export const testFunction = () => {
      if(true) {
        return "Hello World";
      }

      // This is a comment
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

    export const testFunction3 = () => myFunction();

    `;

    const analyzer = new CodeAnalyzer("testFile.ts", options);
    const analysis: ReturnAnalysis = analyzer.analyzeSource(sourceCode);

    expect(analysis).toBeDefined();
    expect(analysis.functions.testFunction.returnStatements.length).toBe(2);
    expect(analysis.functions.testFunction.returnStatements[1].value).toBe(
      "myFunction()"
    );

    expect(
      analysis.functions["TestClass.testMethod"].returnStatements.length
    ).toBeDefined();
  });

  it("should get the return comments", () => {
    const sourceCode = `
    import { myFunction } from "../../final-framework/main.ts";

    /**
     * @auto-docs
     * Hello this is a comment
     */
    export const testFunction = () => {
      // This is a comment
      return {
        hello: "world"
      }
    }

    `;

    const analyzer = new CodeAnalyzer("testFile.ts", options);
    const analysis: ReturnAnalysis = analyzer.analyzeSource(sourceCode);

    expect(analysis.functions.testFunction.returnStatements[0].comment).toBe(
      "This is a comment"
    );

    const comment = parseComment(analysis.functions.testFunction.comment || "");
    expect(comment?.comment).toBe("Hello this is a comment");
  });
});
