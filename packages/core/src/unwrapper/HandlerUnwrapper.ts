import fs from "fs";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

/**
 * An unwrap rule describes how to strip a single layer of middleware wrapping.
 *
 * @example
 * // For `export const handler = middy(myBusinessLogic)`:
 * const MIDDY_UNWRAP_RULE: UnwrapRule = { callee: "middy", argIndex: 0 };
 */
export interface UnwrapRule {
    /** The name of the wrapper function call to match (e.g. `"middy"`). */
    callee: string;
    /** The zero-based index of the argument that holds the actual handler. */
    argIndex: number;
}

/**
 * Statically analyzes a source file to unwrap middleware-wrapped handler exports.
 *
 * Given an exported function name, it follows the call chain defined by the
 * provided `UnwrapRule[]` and returns the underlying (unwrapped) identifier name.
 *
 * @example
 * ```ts
 * // handler.ts: export const handler = middy(myBusinessLogic);
 * HandlerUnwrapper.unwrap("handler", "handler.ts", [MIDDY_UNWRAP_RULE]);
 * // → "myBusinessLogic"
 * ```
 */
export class HandlerUnwrapper {
    /**
     * Unwrap a handler export by traversing the middleware call chain.
     *
     * @param functionName - Exported name to start unwrapping from.
     * @param filePath     - Absolute path to the source file.
     * @param rules        - Ordered list of unwrap rules to apply.
     * @returns The innermost unwrapped identifier name.
     */
    static unwrap(
        functionName: string,
        filePath: string,
        rules: UnwrapRule[]
    ): string {
        if (rules.length === 0) return functionName;

        const source = fs.readFileSync(filePath, "utf-8");
        const ast = parse(source, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });

        // Collect all variable declarator inits (both exported and local).
        const allInits: Record<string, t.Expression | null | undefined> = {};

        traverse(ast, {
            VariableDeclaration(path) {
                for (const declarator of path.node.declarations) {
                    if (t.isIdentifier(declarator.id)) {
                        allInits[declarator.id.name] = declarator.init;
                    }
                }
            },
        });

        let currentName = functionName;
        const triggeredRules = new Set<string>();

        // Iteratively apply rules until no further unwrapping is possible.
        // Each iteration checks whether the current init expression is a
        // matching CallExpression.  If the matching argument is ITSELF a
        // CallExpression (nested wrappers), we synthesise a temporary key
        // and store that expression so the next iteration can resolve it.

        let changed = true;
        while (changed) {
            changed = false;
            const init = allInits[currentName];

            if (!init || !t.isCallExpression(init)) break;

            for (const rule of rules) {
                const callee = init.callee;
                if (t.isIdentifier(callee) && callee.name === rule.callee) {
                    const arg = init.arguments[rule.argIndex];
                    if (!arg) break;

                    triggeredRules.add(rule.callee);

                    if (t.isIdentifier(arg)) {
                        // The inner layer is a simple identifier — follow it.
                        currentName = arg.name;
                        changed = true;
                        break;
                    } else if (t.isCallExpression(arg)) {
                        // The inner layer is itself a call expression (another wrapper).
                        // Store it under a unique synthetic key so the next loop iteration
                        // can continue unwrapping.
                        const syntheticKey = `__unwrap__${currentName}`;
                        allInits[syntheticKey] = arg;
                        currentName = syntheticKey;
                        changed = true;
                        break;
                    }
                }
            }
        }

        // If we ended up on a synthetic key, the identifier name we want is
        // the innermost identifier argument of the final call expression.
        if (currentName.startsWith("__unwrap__")) {
            const finalInit = allInits[currentName];
            if (finalInit && t.isCallExpression(finalInit)) {
                // Dig out the first identifier argument.
                for (const arg of finalInit.arguments) {
                    if (t.isIdentifier(arg)) {
                        // Check if the matching rule applies here too.
                        const callee = finalInit.callee;
                        if (t.isIdentifier(callee)) {
                            for (const rule of rules) {
                                if (callee.name === rule.callee && finalInit.arguments[rule.argIndex] === arg) {
                                    triggeredRules.add(rule.callee);
                                }
                            }
                        }
                        currentName = arg.name;
                        break;
                    }
                }
            }
        }

        // Warn for any rule whose callee was never matched.
        for (const rule of rules) {
            if (!triggeredRules.has(rule.callee)) {
                console.warn(
                    `[HandlerUnwrapper] Rule for callee "${rule.callee}" never matched ` +
                    `when unwrapping "${functionName}" in ${filePath}`
                );
            }
        }

        return currentName;
    }
}
