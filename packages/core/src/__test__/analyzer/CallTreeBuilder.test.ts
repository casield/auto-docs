// LinkedCallTreeBuilder.test.ts
import { CodeAnalyzer, ReturnAnalysis } from "../../analyzer/CodeAnalyzer";
import {
  LinkedCallTreeBuilder,
  NodeReturn,
  CodeAnalysisResult,
} from "../../analyzer/CallTreeBuilder";

describe("LinkedCallTreeBuilder with multiple files", () => {
  it("should build a call tree using import mapping as the source of truth", () => {
    const sourceFile1 = `
      import { bar } from "./file2";

      export function foo() {
        return bar();
      }
    `;
    const sourceFile2 = `
      import { baz } from "./file3";

      export function bar() {
        return baz();
      }
    `;
    const sourceFile3 = `
      export function baz() {
        return "baz";
      }
    `;

    const analyzer1 = new CodeAnalyzer("file1.ts", {});
    const analyzer2 = new CodeAnalyzer("file2.ts", {});
    const analyzer3 = new CodeAnalyzer("file3.ts", {});

    const analysis1: ReturnAnalysis = analyzer1.analyzeSource(sourceFile1);
    const analysis2: ReturnAnalysis = analyzer2.analyzeSource(sourceFile2);
    const analysis3: ReturnAnalysis = analyzer3.analyzeSource(sourceFile3);

    const analysisResults: CodeAnalysisResult[] = [
      {
        fileName: "file1.ts",
        analysis: analysis1,
        importMap: analyzer1.importMap,
      },
      {
        fileName: "file2.ts",
        analysis: analysis2,
        importMap: analyzer2.importMap,
      },
      {
        fileName: "file3.ts",
        analysis: analysis3,
        importMap: analyzer3.importMap,
      },
    ];

    // For this test, we assume that the import maps have entries like:
    //   "bar": "./file2"
    //   "baz": "./file3"
    // The builder will normalize these to "file2.ts" and "file3.ts", respectively.
    // (If needed, you can adjust your analyzer's importMap accordingly.)

    const isFinalFn = (fnName: string) => fnName === "baz";
    const builder = new LinkedCallTreeBuilder(analysisResults, isFinalFn);
    const tree: NodeReturn = builder.buildNodeTree("foo", "file1.ts");
    console.log(builder.visualizeTree(tree));

    expect(tree.value).toBe("foo");
    expect(tree.children && tree.children[0].value).toBe("bar");
    expect(
      tree.children &&
        tree.children[0].children &&
        tree.children[0].children[0].value
    ).toBe("baz");
  });
});
