import { LambdaDocsBuilder } from "@drokt/core";
import { NodeReturn } from "./analyze-function-v2";
import generator from "@babel/generator";

export const recreateDocs = (
  nodes: NodeReturn[],
  builder: LambdaDocsBuilder<"openApi">
) => {
  nodes.forEach((node) => {
    // with ast get the json
    // and pass it to the builder

    const finalNodes = getFinalNodes(node).map((n) => {
      const ast = n.nodePath;

      const { code } = generator(ast?.node!, {
        retainLines: true,
        retainFunctionParens: true,
      });

      console.log(code);
    });
  });
};

export const getFinalNodes = (node: NodeReturn) => {
  const finalNodes: NodeReturn[] = [];

  const queue: NodeReturn[] = [node];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    finalNodes.push(current);

    if (current.children) {
      queue.push(...current.children);
    }
  }

  return finalNodes;
};
