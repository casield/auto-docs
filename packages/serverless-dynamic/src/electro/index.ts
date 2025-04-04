import { Entity } from "electrodb";

export const LinkerObjectEntity = new Entity({
  model: {
    entity: "linkerObject",
    version: "1",
    service: "store",
  },
  attributes: {
    plugin: {
      type: "string",
      required: true,
    },
    version: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    data: {
      type: "any",
      required: true,
    },
  },
  indexes: {
    plugin: {
      pk: {
        // highlight-next-line
        field: "pk",
        composite: ["plugin"],
      },
      sk: {
        // highlight-next-line
        field: "sk",
        composite: ["version"],
      },
    },
  },
});
