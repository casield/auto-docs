/**
 * Parses a block comment containing "@auto-docs" and returns a structured object
 * that *always* includes a `comment` property, plus any `@tag` properties.
 */
export function parseComment<T = {}>(
  commentBlock: string
): (T & { comment: string }) | undefined {
  const prefix = "@auto-docs";

  // 1. Remove /*, */ and leading asterisks:
  let cleaned = commentBlock
    // Remove starting /* and ending */
    .replace(/^\/\*+/, "")
    .replace(/\*+\//, "")
    // For each line, remove leading '*' or whitespace
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .join("\n");

  // 2. Split into lines
  const lines = cleaned.split("\n");

  // 3. Find "@auto-docs"
  let autoDocsIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(prefix)) {
      autoDocsIndex = i;
      break;
    }
  }

  // If there's no "@auto-docs", return undefined
  if (autoDocsIndex === -1) {
    return undefined;
  }

  // 4. We'll parse lines after "@auto-docs"
  const result: Record<string, string> = {
    comment: "",
  };

  // 5. Iterate from the line *after* @auto-docs to the end
  for (let i = autoDocsIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // If it starts with '@', parse a tag
    if (line.startsWith("@")) {
      const spaceIndex = line.indexOf(" ");
      if (spaceIndex > 0) {
        const keyPart = line.slice(0, spaceIndex); // e.g. "@schema"
        const valuePart = line.slice(spaceIndex).trim(); // e.g. "{ message: string } | User"
        const key = keyPart.replace(/^@/, ""); // e.g. "schema"
        result[key] = valuePart;
      } else {
        // If the line is just "@something", store empty string
        const key = line.replace(/^@/, "");
        result[key] = "";
      }
    } else {
      // Otherwise, it's just comment text appended to 'comment'
      if (result.comment) {
        result.comment += "\n" + line;
      } else {
        result.comment = line;
      }
    }
  }

  // 6. Return as T & { comment: string }
  //    Ensures `comment` property is always present
  return result as T & { comment: string };
}
