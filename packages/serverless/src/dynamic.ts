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
          schema: {
            type: "object",
            properties: createPropertiesFromBody(response.body),
          },
        },
      });

      console.log("response", builder);
    }

    return response;
  };
};

function createPropertiesFromBody(body: any): { [key: string]: any } {
  const properties: { [key: string]: any } = {};
  for (const key in body) {
    if (typeof body[key] === "object") {
      properties[key] = createPropertiesFromBody(body[key]);
    } else {
      properties[key] = { type: typeof body[key] };
    }
  }
  return properties;
}
