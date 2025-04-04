import { NodeReturn } from "@auto-docs/core";

/**
 * Recursively collects the `description` from every leaf node in the tree.
 */
export function collectLeafDescriptions(
  node: NodeReturn,
  result: { node: NodeReturn; value: string }[] = []
) {
  // Leaf node: no children
  if (!node.children || node.children.length === 0) {
    if (node.description) {
      result.push({
        node,
        value: node.description,
      });
    }
    return result;
  }

  // Otherwise, recurse
  for (const child of node.children) {
    collectLeafDescriptions(child, result);
  }
  return result;
}
