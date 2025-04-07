import { Linker } from "@auto-docs/core";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { LinkerObjectEntity } from "./electro";

export class DynamoLinker extends Linker<AutoDocsTypes.AvailablePlugins> {
  constructor(public tableName: string) {
    super();
    this.init();
  }

  init() {}

  async link(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<void> {
    await LinkerObjectEntity.put({
      plugin: doc.plugin,
      version: doc.version,
      name: doc.name,
      data: doc.data,
    }).go();
  }

  async pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>
  > {
    const result = await LinkerObjectEntity.query
      .pk({ plugin: "openApi" })
      .go()
      .then((result) => {
        return result.data.map((item) => {
          return {
            plugin: item.plugin as AutoDocsTypes.AvailablePlugins,
            version: item.version,
            name: item.name,
            description: item.name,
            data: item.data,
          };
        });
      });
    return {
      openApi: result,
    };
  }

  async has(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<boolean> {
    const result = await LinkerObjectEntity.query
      .pk({ plugin: doc.plugin, name: doc.name, version: doc.version })
      .go();
    return result.data.length > 0;
  }
}
