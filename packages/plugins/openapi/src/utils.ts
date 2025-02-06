/**
 * Parses a string such as:
 *   "@schema { message: string } | $User"
 *   "@schema { message: string }"
 *   "@schema $User"
 * and returns an OpenAPI-like response object.
 */
export function parseSchemaString(
  schemaStr: string,
  statusCode: number
): DroktTypes.OpenApiResponse {
  // 1) Remove the leading "@schema " if present
  const trimmed = schemaStr.replace(/^@schema\s*/, "").trim();

  // 2) Split on "|" to see if we have multiple variants
  const variants = trimmed.split("|").map((v) => v.trim());

  // 3) Parse each variant into an object or a reference
  const parsedVariants = variants.map(parseVariant);

  // 4) If we have only one variant, return a single schema (no "oneOf")
  let schema: DroktTypes.OpenApiResponse["200"]["content"]["application/json"]["schema"];
  if (parsedVariants.length === 1) {
    schema = parsedVariants[0];
  } else {
    // If multiple variants, combine them via "oneOf"
    schema = {
      oneOf: parsedVariants,
    };
  }

  // 5) Return the final shape (for status code 200, content type application/json)
  return {
    [statusCode]: {
      description: "OK",
      content: {
        "application/json": {
          schema,
        },
      },
    },
  };
}

/**
 * Helper function to parse a single variant, which could be:
 *   - An inline object: "{ message: string, ... }"
 *   - A reference to a component schema (indicated by "$" prefix): "$User"
 */
function parseVariant(variant: string) {
  // If starts with '{', treat as inline object
  if (variant.startsWith("{")) {
    return parseInlineObject(variant);
  }

  // If starts with '$', treat as a reference to a component schema
  if (variant.startsWith("$")) {
    const refName = variant.slice(1); // remove '$'
    return {
      $ref: `#/components/schemas/${refName}`,
    };
  }

  // If we want to be strict, throw an error. Or handle it as you see fit:
  throw new Error(
    `Invalid variant "${variant}". Must start with "{" for inline object or "$" for reference.`
  );
}

/**
 * Parse an inline object string like:
 *   "{ message: string, count: number }"
 * and convert it to a simple "type: object" with properties { ... }.
 */
function parseInlineObject(objStr: string) {
  // Remove outer braces
  const content = objStr
    .replace(/^\{\s*/, "")
    .replace(/\s*\}$/, "")
    .trim();

  // Split on commas to get each "key: type" pair
  // NOTE: This is a simplistic approach. It won't handle nested braces, etc.
  const pairs = content.split(",").map((p) => p.trim());

  const properties: Record<string, { type: string }> = {};

  for (const pair of pairs) {
    // Expecting "key: type"
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
