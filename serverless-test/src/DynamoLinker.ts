import { Linker } from "@auto-docs/core";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

export class DynamoLinker extends Linker<AutoDocsTypes.AvailablePlugins> {
  private client: DynamoDBClient;

  constructor(public tableName: string) {
    super();
    this.client = new DynamoDBClient({});
    this.init();
  }

  init() {}

  async link(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<void> {
    console.log("linking", doc);
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(
          {
            pk: doc.plugin,
            sk: doc.version,
            description: doc.description,
            data: doc.data,
          },
          { removeUndefinedValues: true }
        ),
      })
    );
  }

  async pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>
  > {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );

    return (result.Items || []).reduce((acc, item) => {
      const unmarshalled = unmarshall(item);
      const key = unmarshalled.pk as string;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push({
        plugin: unmarshalled.pk as AutoDocsTypes.AvailablePlugins,
        version: unmarshalled.sk,
        description: unmarshalled.description || "",
        data: unmarshalled.data,
      });
      return acc;
    }, {} as Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>);
  }

  async has(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<boolean> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({
          pk: doc.plugin,
          sk: doc.version,
        }),
      })
    );
    return !!result.Item;
  }
}
