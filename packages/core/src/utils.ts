/**
 * Parses a block comment containing "@auto-docs" and returns a structured object.
 *
 * @param commentBlock The entire comment text, including /* and *\/
 * @returns An object with `comment` plus any `@tag` properties
 */
export function parseComment(commentBlock: string): Record<string, string> {
  const prefix = "@auto-docs";

  // 1. Remove the /*, */ and any leading asterisks.
  //    This way we can iterate line by line cleanly.
  let cleaned = commentBlock
    // Remove starting /* and ending */
    .replace(/^\/\*+/, "")
    .replace(/\*+\/$/, "")
    // For each line, remove leading '*' or whitespace
    .split("\n")
    .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
    .join("\n");

  // 2. Split into lines
  const lines = cleaned.split("\n");

  // 3. Find if there's a line that contains "@auto-docs".
  //    We only process lines *after* we see "@auto-docs".
  let autoDocsIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(prefix)) {
      autoDocsIndex = i;
      break;
    }
  }

  // If there's no "@auto-docs" in the comment, return an empty object or handle differently as needed.
  if (autoDocsIndex === -1) {
    return {};
  }

  // 4. We'll parse lines after @auto-docs into an output object.
  const result: Record<string, string> = {
    comment: "",
  };

  // 5. Iterate from the line *after* @auto-docs to the end of the comment.
  for (let i = autoDocsIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    // If it's empty, skip.
    if (!line) continue;

    // If it starts with '@', parse the next token as a tag.
    // e.g., "@schema { message: string } | User"
    // -> key = 'schema', value = '{ message: string } | User'
    if (line.startsWith("@")) {
      const spaceIndex = line.indexOf(" ");
      if (spaceIndex > 0) {
        // e.g., '@schema { message: string } | User'
        // keyPart = '@schema', valuePart = '{ message: string } | User'
        const keyPart = line.slice(0, spaceIndex); // '@schema'
        const valuePart = line.slice(spaceIndex).trim(); // '{ message: string } | User'

        // Remove leading '@'
        const key = keyPart.replace(/^@/, ""); // 'schema'
        result[key] = valuePart;
      } else {
        // If there's a line like "@schema" with no trailing text, store empty value
        const key = line.replace(/^@/, "");
        result[key] = "";
      }
    } else {
      // Otherwise, it's just comment text. Append to `result.comment`.
      // You can also add line breaks if you prefer, or store them as an array, etc.
      if (result.comment) {
        // if there's already some comment text, add a space or newline
        result.comment += "\n" + line;
      } else {
        result.comment = line;
      }
    }
  }

  return result;
}
