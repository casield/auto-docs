import { LambdaDocsBuilder } from "@auto-docs/core";
import { APIGatewayEvent, APIGatewayProxyResultV2, Handler } from "aws-lambda";
import { createHash } from "crypto";

export const dynamicAutoDocs = <T extends "openApi">(
  handler: Handler<APIGatewayEvent, APIGatewayProxyResultV2>,
  builder: LambdaDocsBuilder<T>
): Handler<APIGatewayEvent, APIGatewayProxyResultV2> => {
  return async (event, context) => {
    const response = await new Promise<APIGatewayProxyResultV2>(
      (resolve, reject) => {
        const result = handler(event, context, (error, result) => {
          if (error) return reject(error);
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Handler returned undefined result"));
          }
        });

        // If the handler returns a Promise, use it.
        if (result && typeof result.then === "function") {
          result.then(resolve).catch(reject);
        }
      }
    );

    if (typeof response === "object" && response.statusCode) {
      const http =
        "http" in event.requestContext
          ? (event.requestContext.http as {
              method: string;
              path: string;
            })
          : undefined;

      if (!http) {
        throw new Error("HTTP context not found in event");
      }

      const name = getHash([
        http.method,
        http.path,
        Object.keys(JSON.parse(response.body || "{}")),
        response.statusCode,
      ]);

      const aggregatedResponse = {
        ...response,
        version: (response as { version: string }).version || "0.0.0",
        description: (response as { description: string }).description,
      };

      await builder.docs("openApi", {
        type: "method",
        name: `${http.method}-${http.path}`,
        version: aggregatedResponse.version,
        method: http.method as any,
        path: http.path,
      });

      await builder.docs("openApi", {
        type: "response",
        name,
        version: aggregatedResponse.version,
        statusCode: response.statusCode,
        description: aggregatedResponse.description,
        contentType: "application/json",
        path: {
          method: http.method,
          path: http.path,
        },
        schema: createPropertiesFromBody(JSON.parse(response.body || "{}")),
      });
    }

    return response;
  };
};

function createPropertiesFromBody(body: any) {
  const properties: Record<
    string,
    AutoDocsTypes.SchemaObject | AutoDocsTypes.ReferenceObject
  > = {};
  for (const key in body) {
    if (typeof body[key] === "object" && !Array.isArray(body[key])) {
      properties[key] = createPropertiesFromBody(body[key]);
    } else if (typeof body[key] === "string") {
      properties[key] = {
        type: "string",
      };
    } else if (Array.isArray(body[key])) {
      properties[key] = {
        type: "array",
        items: {
          type:
            typeof body[key][0] === "object" ? "object" : typeof body[key][0],
          items:
            typeof body[key][0] === "string"
              ? undefined
              : createPropertiesFromBody(body[key][0]),
        },
      };
    } else if (typeof body[key] === "number") {
      properties[key] = { type: "number" };
    } else if (typeof body[key] === "boolean") {
      properties[key] = { type: "boolean" };
    } else if (body[key] === null) {
      properties[key] = { type: "null" };
    } else {
      properties[key] = { type: typeof body[key] };
    }
  }
  const schema: AutoDocsTypes.SchemaObject = {
    type: "object",
    properties,
  };
  return schema;
}

function getHash<T>(data: T[]) {
  return createHash("sha256").update(data.join(" "), "utf8").digest("hex");
}
