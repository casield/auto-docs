import { APIGatewayEvent } from "aws-lambda";
import { DynamoLinker } from "./DynamoLinker";
import { Linker } from "@auto-docs/core";

export const lambdaProxy = () => {
  return async (event: APIGatewayEvent) => {
    const linker = new DynamoLinker(process.env.LINKER_TABLE_NAME || "");
    const path = event.pathParameters?.proxy;

    if (path === "pull") {
      const result = await linker.pull();
      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    }

    if (path === "link") {
      const { plugin, version, name, data } = JSON.parse(event.body || "{}");
      await linker.link({
        plugin,
        version,
        name,
        data,
        description: `Linked ${name} with version ${version}`,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Linked successfully" }),
      };
    }

    if (path === "has") {
      const { plugin, version, name, data } = JSON.parse(event.body || "{}");
      const result = await linker.has({
        plugin,
        version,
        name,
        description: `Checked if ${name} with version ${version} exists`,
        data,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({ exists: result }),
      };
    }
  };
};

export class DynamicProxyLinker extends Linker<AutoDocsTypes.AvailablePlugins> {
  constructor(public url: string) {
    super();
  }

  async link(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<void> {
    return await fetch(`${this.url}/link`, {
      method: "POST",
      body: JSON.stringify(doc),
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error("Failed to link document");
      }
    });
  }
  async pull(): Promise<
    Record<string, AutoDocsTypes.LinkerObject<"openApi">[]>
  > {
    const result = await fetch(`${this.url}/pull`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error("Failed to pull documents");
      }
      return res.json();
    });
    return result;
  }
  async has(doc: AutoDocsTypes.LinkerObject<"openApi">): Promise<boolean> {
    return await fetch(`${this.url}/has`, {
      method: "POST",
      body: JSON.stringify(doc),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to check document");
        }
        return res.json();
      })
      .then((res) => res.exists);
  }
}
