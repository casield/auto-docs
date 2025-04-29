import { Linker } from "./Linker";

export class MemoryLinker<
  T extends keyof AutoDocsTypes.Plugins
> extends Linker<T> {
  private docs: Record<string, AutoDocsTypes.LinkerObject<T>[]> = {};

  public async link(doc: AutoDocsTypes.LinkerObject<T>): Promise<void> {
    if (!this.docs[doc.plugin]) {
      this.docs[doc.plugin] = [];
    }

    const existingDocIndex = this.docs[doc.plugin].findIndex(
      (d) =>
        d.name === doc.name &&
        d.version === doc.version &&
        d.branch === doc.branch
    );
    if (existingDocIndex !== -1) {
      this.docs[doc.plugin][existingDocIndex] = doc;
    } else {
      this.docs[doc.plugin].push(doc);
    }
  }

  public async pull(
    branch: string
  ): Promise<Record<string, AutoDocsTypes.LinkerObject<T>[]>> {
    return Object.fromEntries(
      Object.entries(this.docs).map(([plugin, docs]) => [
        plugin,
        docs.filter((doc) => doc.branch === branch),
      ])
    );
  }

  public async has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean> {
    return (
      !!this.docs[doc.plugin] &&
      this.docs[doc.plugin].some(
        (d) =>
          d.name === doc.name &&
          d.version === doc.version &&
          d.branch === doc.branch
      )
    );
  }

  public async delete(doc: AutoDocsTypes.LinkerObject<T>): Promise<void> {
    if (this.docs[doc.plugin]) {
      this.docs[doc.plugin] = this.docs[doc.plugin].filter(
        (d) =>
          d.name !== doc.name ||
          d.version !== doc.version ||
          d.branch !== doc.branch
      );
    }
  }
}
