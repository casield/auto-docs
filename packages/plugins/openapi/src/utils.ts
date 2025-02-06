import { NodeReturn, parseComment } from "@drokt/core";
import { IOpenApiCommentBlockResponse } from "./types";

/**
 * Parses a string such as:
 *   "@schema { message: string } | $User"
 *   "@schema { message: string }"
 *   "@schema $User"
 * and returns an OpenAPI-like responses object.
 *
 * The returned object conforms to the `ResponsesObject` interface:
 *
 * export interface ResponsesObject {
 *   [statusCode: string]: ResponseObject | ReferenceObject;
 * }
 */
export function parseSchemaString(
  schemaStr: string,
  statusCode: number,
  node: NodeReturn
): DroktTypes.ResponsesObject {
  // 1) Remove the leading "@schema " if present and trim whitespace
  const trimmed = schemaStr.replace(/^@schema\s*/, "").trim();

  // 2) Split on "|" to see if we have multiple variants
  const variants = trimmed.split("|").map((v) => v.trim());

  // 3) Parse each variant into an inline schema object or a reference object
  const parsedVariants = variants.map(parseVariant);

  // 4) If only one variant is provided, use it directly; otherwise use "oneOf"
  let schema: DroktTypes.SchemaObject;
  if (parsedVariants.length === 1) {
    schema = parsedVariants[0];
  } else {
    schema = {
      oneOf: parsedVariants,
    };
  }

  const description = parseComment<IOpenApiCommentBlockResponse>(
    node.description || ""
  );

  // 5) Build and return the final response object for the given status code.
  // Note: Since statusCode keys are strings in the type, we can rely on TS converting the number.
  const responseObject: DroktTypes.ResponseObject = {
    description: description?.comment || "",
    content: {
      [description?.type || "application/json"]: {
        schema,
      },
    },
  };

  return {
    [statusCode]: responseObject,
  };
}

/**
 * Helper function to parse a single variant.
 * Variants can be:
 *   - An inline object: "{ message: string, count: number }"
 *   - A reference to a component schema (indicated by a "$" prefix): "$User"
 */
function parseVariant(variant: string): DroktTypes.SchemaObject {
  // If the variant starts with '{', assume it's an inline object definition.
  if (variant.startsWith("{")) {
    return parseInlineObject(variant);
  }

  // If the variant starts with '$', treat it as a reference.
  if (variant.startsWith("$")) {
    const refName = variant.slice(1).trim(); // Remove the '$' prefix and trim
    return {
      $ref: `#/components/schemas/${refName}`,
    };
  }

  // If the variant does not match either format, throw an error.
  throw new Error(
    `Invalid variant "${variant}". Must start with "{" for inline object or "$" for reference.`
  );
}

/**
 * Parses an inline object string like:
 *   "{ message: string, count: number }"
 * and converts it into a SchemaObject with a type of "object" and corresponding properties.
 *
 * NOTE: This is a simplistic parser and will not handle nested objects or more complex types.
 */
function parseInlineObject(objStr: string): DroktTypes.SchemaObject {
  // Remove the outer braces
  const content = objStr
    .replace(/^\{\s*/, "")
    .replace(/\s*\}$/, "")
    .trim();

  // Split on commas to separate each "key: type" pair
  const pairs = content.split(",").map((p) => p.trim());

  const properties: Record<string, { type: string }> = {};

  for (const pair of pairs) {
    // Expecting each pair to be in the form "key: type"
    const [key, value] = pair.split(":").map((s) => s.trim());
    if (!key || !value) {
      throw new Error(`Invalid property definition: "${pair}"`);
    }
    properties[key] = { type: value };
  }

  return {
    type: "object",
    properties,
  };
}
