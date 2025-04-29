import { Linker } from "@auto-docs/core";
import { LinkerObjectEntity } from "./electro";

export class DynamoLinker extends Linker<AutoDocsTypes.AvailablePlugins> {
  constructor(public tableName: string) {
    super();
    this.init();
    LinkerObjectEntity.setTableName(tableName);
  }

  init() {}

  async link(
    doc: AutoDocsTypes.LinkerObject<AutoDocsTypes.AvailablePlugins>
  ): Promise<void> {
    await LinkerObjectEntity.put({
      plugin: doc.plugin,
      version: doc.version,
      name: doc.name,
      data: JSON.parse(JSON.stringify(doc.data)),
      branch: doc.branch,
    }).go();
  }

  async pull(
    branch?: string
  ): Promise<
    Record<string, AutoDocsTypes.LinkerObject<AutoDocsTypes.AvailablePlugins>[]>
  > {
    const data = await (branch
      ? LinkerObjectEntity.query
          .pk({
            branch,
          })
          .go()
      : LinkerObjectEntity.scan.go());

    data.data = data.data.map((item) => {
      return {
        ...item,
        data: JSON.parse(JSON.stringify(item.data)),
      };
    });
    const result: Record<
      string,
      AutoDocsTypes.LinkerObject<AutoDocsTypes.AvailablePlugins>[]
    > = {};
    data.data.forEach((item) => {
      if (!result[item.plugin]) {
        result[item.plugin] = [];
      }
      result[item.plugin].push({
        plugin: item.plugin as AutoDocsTypes.AvailablePlugins,
        version: item.version,
        name: item.name,
        data: item.data,
        branch: item.branch,
        description: item.data.description || "",
      });
    });
    return result;
  }

  async has(
    doc: AutoDocsTypes.LinkerObject<AutoDocsTypes.AvailablePlugins>
  ): Promise<boolean> {
    const result = await LinkerObjectEntity.query
      .pk({
        plugin: doc.plugin,
        name: doc.name,
        version: doc.version,
        branch: doc.branch,
      })
      .go();
    return result.data.length > 0;
  }

  async delete(
    doc: AutoDocsTypes.LinkerObject<AutoDocsTypes.AvailablePlugins>
  ): Promise<void> {
    await LinkerObjectEntity.delete({
      plugin: doc.plugin,
      name: doc.name,
      version: doc.version,
      branch: doc.branch,
    }).go();
  }
}
