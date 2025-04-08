import { Linker } from "./Linker";

export class MemoryLinker<
  T extends keyof AutoDocsTypes.Plugins
> extends Linker<T> {
  private docs: Record<string, AutoDocsTypes.LinkerObject<T>[]> = {};

  public async link(doc: AutoDocsTypes.LinkerObject<T>): Promise<void> {
    if (!this.docs[doc.plugin]) {
      this.docs[doc.plugin] = [];
    }
    this.docs[doc.plugin].push(doc);
  }

  public async pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<T>[]>
  > {
    return this.docs;
  }

  public async has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean> {
    return !!this.docs[doc.plugin];
  }
}
