import { Linker } from "@auto-docs/core";
import { LinkerObjectEntity } from "./electro";
import { DocumentClient } from "electrodb";

export class DynamoLinker extends Linker<AutoDocsTypes.AvailablePlugins> {
  constructor(public tableName: string, public client: DocumentClient) {
    super();

    LinkerObjectEntity.setTableName(tableName);
    LinkerObjectEntity.setClient(client);

    this.init();
  }
  init() {}

  async link(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<void> {
    await LinkerObjectEntity.put({
      plugin: doc.plugin,
      version: doc.version,
      description: doc.description,
      data: doc.data,
    }).go();
  }
  async pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>
  > {
    return (await LinkerObjectEntity.scan.go()).data.reduce((acc, item) => {
      const key = item.plugin as string;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        plugin: item.plugin as AutoDocsTypes.AvailablePlugins,
        version: item.version,
        description: item.description || "",
        data: item.data,
      });
      return acc;
    }, {} as Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>);
  }
  async has(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<boolean> {
    return await LinkerObjectEntity.get({
      plugin: doc.plugin,
      version: doc.version,
    })
      .go()
      .then((res) => {
        return !!(res.data?.data.length > 0);
      });
  }
}
