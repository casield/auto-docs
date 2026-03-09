import { AutoDocsBuilder } from ".";
import type { NodeReturn } from "./analyzer";

export abstract class AutoDocsPlugin<T extends string = string> {
  type: T;

  public constructor(type: T) {
    this.type = type;
  }

  public onBuild<C>(
    docs: T extends keyof AutoDocsTypes.Plugins ? AutoDocsTypes.Plugins[T][] : any[],
    builder: AutoDocsBuilder<any>
  ): C | Promise<C> {
    throw new Error("Method not implemented.");
  }

  public onInit(builder: AutoDocsBuilder<any>): void { }

  public onEnd(builder: AutoDocsBuilder<any>): void { }

  public onDoc(
    doc: T extends keyof AutoDocsTypes.Plugins ? AutoDocsTypes.Plugins[T] : any
  ): T extends keyof AutoDocsTypes.Plugins ? AutoDocsTypes.Plugins[T] : any {
    return doc;
  }

  /**
   * Called once per entry point with the full call tree rooted at that entry's
   * function. The root node's `description` may contain `AUTO_DOCS_META:<json>`
   * with HTTP metadata serialised by the runner.
   *
   * This hook is **optional** — plugins that do not implement it are silently
   * skipped when the runner delivers trees.
   */
  public onAnalysis?(trees: NodeReturn[]): void;
}
