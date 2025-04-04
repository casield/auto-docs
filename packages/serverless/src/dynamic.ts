import { LambdaDocsBuilder } from "@auto-docs/core";
import { OpenApiDoc } from "@auto-docs/openapi-plugin";
import { APIGatewayEvent, APIGatewayProxyResultV2, Handler } from "aws-lambda";

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
      builder.docs("openApi", {
        type: "response",
        name: "Test dynamic",
        version: "1.0.0",
        data: {
          statusCode: response.statusCode,
          description: "Test dynamic",
          contentType: "application/json",
          path: {
            method: event.httpMethod,
            path: event.path,
          },
          schema: createPropertiesFromBody(JSON.parse(response.body || "{}")),
        },
      });

      console.log("response", builder);
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
