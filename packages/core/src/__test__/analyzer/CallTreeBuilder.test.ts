// CallTreeBuilder.test.ts
import { CodeAnalyzer, ReturnAnalysis } from "../../analyzer/CodeAnalyzer";
import {
  LinkedCallTreeBuilder,
  NodeReturn,
  CodeAnalysisResult,
} from "../../analyzer/CallTreeBuilder";

describe("LinkedCallTreeBuilder with multiple files", () => {
  it("should build a call tree using import mapping as the source of truth", () => {
    const sourceFile1 = `
      import { bar } from "src/cool/file2";

      export const foo = async ()=>{
        return await bar();
      }
    `;
    const sourceFile2 = `
      import { baz } from "../../file3";

      export async function bar() {
        return await baz();
      }
    `;
    const sourceFile3 = `
      import { Foo } from "./src/file4";
      export async function baz() {
        const f = new Foo();

        if (true) {
          return f.foo();
        }

        return await f.bar();
      }
    `;

    const sourceFile4 = `
      export class Foo {

        public async foo() {
          return "bar";
        }

        public async bar() {
          if (true) {
            return "baz";
          }

          return await this.foo();
        }
      }
      `;

    const analyzer1 = new CodeAnalyzer("file1.ts", {});
    const analyzer2 = new CodeAnalyzer("src/cool/file2.ts", {});
    const analyzer3 = new CodeAnalyzer("file3.ts", {});
    const analyzer4 = new CodeAnalyzer("src/file4.ts", {});

    analyzer1.analyzeSource(sourceFile1);
    analyzer2.analyzeSource(sourceFile2);
    analyzer3.analyzeSource(sourceFile3);
    analyzer4.analyzeSource(sourceFile4);

    const analysisResults = buildAnalysisResults([
      {
        analyzer: analyzer1,
        sourceCode: sourceFile1,
      },
      {
        analyzer: analyzer2,
        sourceCode: sourceFile2,
      },
      {
        analyzer: analyzer3,
        sourceCode: sourceFile3,
      },
      {
        analyzer: analyzer4,
        sourceCode: sourceFile4,
      },
    ]);

    const builder = new LinkedCallTreeBuilder(analysisResults);
    const tree: NodeReturn = builder.buildNodeTree("foo", "file1.ts");
    const viz = builder.visualizeTree(tree);
    console.log(viz);

    expect(tree.value).toBe("foo");
    expect(viz).toBe(`foo() [call]
  bar() [call]
    baz() [call]
      Foo.foo() [call]
        "bar" [literal]
      Foo.bar() [call]
        "baz" [literal]
        Foo.foo() [call]
          "bar" [literal]
`);
  });

  it("should resolve unknow sources", () => {
    const sourceFile1 = `
      import { bar } from "@/cool/file2";

      export const foo = async ()=>{
        return await bar();
      }
    `;
    const sourceFile2 = `
      export async function bar() {
        return "baz";
      }
    `;

    const resolvePath = (source: string, file: string) => {
      if (source.startsWith("@")) {
        return source.replace("@", "src");
      }
      return source;
    };

    const analyzer1 = new CodeAnalyzer("file1.ts", {
      resolvePath,
    });
    const analyzer2 = new CodeAnalyzer("src/cool/file2.ts", { resolvePath });

    analyzer1.analyzeSource(sourceFile1);
    analyzer2.analyzeSource(sourceFile2);

    const analysisResults = buildAnalysisResults([
      {
        analyzer: analyzer1,
        sourceCode: sourceFile1,
      },
      {
        analyzer: analyzer2,
        sourceCode: sourceFile2,
      },
    ]);

    const builder = new LinkedCallTreeBuilder(analysisResults);
    const tree: NodeReturn = builder.buildNodeTree("foo", "file1.ts");
    const viz = builder.visualizeTree(tree);
    console.log(viz);

    expect(tree.value).toBe("foo");
    expect(viz).toBe(`foo() [call]
  bar() [call]
    "baz" [literal]
`);
  });
});

const buildAnalysisResults = (
  analyzer: { analyzer: CodeAnalyzer; sourceCode: string }[]
): CodeAnalysisResult[] => {
  return analyzer.map((a) => ({
    fileName: a.analyzer.fileName,
    analysis: a.analyzer.analyzeSource(a.sourceCode),
    importMap: a.analyzer.importMap,
  }));
};
