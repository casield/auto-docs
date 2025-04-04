export abstract class Linker<T extends keyof AutoDocsTypes.Plugins>
  implements AutoDocsTypes.ILinker<T>
{
  public abstract link(doc: AutoDocsTypes.LinkerObject<T>): Promise<void>;
  public abstract pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<T>[]>
  >;
  public abstract has(doc: AutoDocsTypes.LinkerObject<T>): Promise<boolean>;
}
