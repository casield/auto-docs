import { Entity } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const LinkerObjectEntity = new Entity(
  {
    model: {
      entity: "linkerObject",
      version: "1",
      service: "auto-docs",
    },
    attributes: {
      plugin: {
        type: "string",
      },
      version: {
        type: "string",
        required: true,
      },
      name: {
        type: "string",
        required: true,
      },
      data: {
        type: "any",
      },
    },
    indexes: {
      pk: {
        pk: {
          field: "pk",
          composite: ["plugin"],
        },
        sk: {
          field: "sk",
          composite: ["name", "version"],
        },
      },
    },
  },
  {
    client: new DynamoDBClient(),
  }
);
