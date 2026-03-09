import fs from "fs";
import path from "path";
import { FrameworkAdapter, EntryPoint } from "@auto-docs/core";
import { CodeAnalyzer } from "@auto-docs/core/src/analyzer/CodeAnalyzer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Express Router method names we recognise as HTTP routes. */
const HTTP_METHODS = ["get", "post", "put", "delete", "patch", "head", "options"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

// ---------------------------------------------------------------------------

export interface ExpressAdapterOptions {
    /**
     * Absolute (or resolvable) path to the Express router source file.
     * The adapter will statically analyse this file for route declarations.
     */
    routerPath: string;
}

/**
 * Resolves handler entry points by statically analysing an Express router file.
 *
 * Recognises the pattern: `router.<method>('<path>', handlerFn)` (or
 * `app.<method>(...)`) and resolves the handler identifier to its source
 * file via the file's import map.
 *
 * @example
 * ```ts
 * const adapter = new ExpressAdapter({ routerPath: '/src/router.ts' });
 * const entries = adapter.resolveEntryPoints();
 * // → [{ filePath: '/src/handlers/users.ts', functionName: 'getUsers', metadata: { httpMethod: 'GET', httpPath: '/users' } }]
 * ```
 */
export class ExpressAdapter extends FrameworkAdapter {
    constructor(private readonly opts: ExpressAdapterOptions) {
        super();
    }

    resolveEntryPoints(): EntryPoint[] {
        const routerPath = path.resolve(this.opts.routerPath);
        const source = fs.readFileSync(routerPath, "utf-8");

        const analyzer = new CodeAnalyzer(routerPath, {
            resolvePath: (importPath: string, fileName: string): string | null => {
                if (!importPath.startsWith(".")) return null;
                const base = path.resolve(path.dirname(fileName), importPath);
                return this.resolveWithExtension(base);
            },
        });

        // Build the import map.
        analyzer.analyzeSource(source);

        // Parse again for AST traversal — CodeAnalyzer already parsed it,
        // but we need access to CallExpressions at the router level.
        const { parse } = require("@babel/parser");
        const traverse = require("@babel/traverse").default;
        const t = require("@babel/types");

        const ast = parse(source, {
            sourceType: "module",
            plugins: ["typescript", "jsx"],
        });

        const entries: EntryPoint[] = [];

        traverse(ast, {
            ExpressionStatement: (nodePath: any) => {
                const expr = nodePath.node.expression;

                // Match: <anything>.<httpMethod>(<path_literal>, ..., <handler_id>)
                if (
                    !t.isCallExpression(expr) ||
                    !t.isMemberExpression(expr.callee) ||
                    !t.isIdentifier(expr.callee.property)
                ) {
                    return;
                }

                const method = expr.callee.property.name as string;
                if (!HTTP_METHODS.includes(method as HttpMethod)) return;

                const args = expr.arguments;
                if (args.length < 2) return;

                const pathArg = args[0];
                if (!t.isStringLiteral(pathArg)) return;

                // The handler is the last argument.
                const handlerArg = args[args.length - 1];
                if (!t.isIdentifier(handlerArg)) return;

                const handlerName: string = handlerArg.name;
                const httpPath: string = pathArg.value.startsWith("/")
                    ? pathArg.value
                    : `/${pathArg.value}`;

                // Resolve the handler's source file through the import map.
                const resolvedFile: string | undefined = analyzer.importMap[handlerName];

                const filePath = resolvedFile
                    ? this.resolveWithExtension(resolvedFile) ?? resolvedFile
                    : routerPath;

                entries.push({
                    filePath,
                    functionName: handlerName,
                    metadata: {
                        httpMethod: method.toUpperCase(),
                        httpPath,
                    },
                });
            },
        });

        return entries;
    }

    private resolveWithExtension(filePath: string): string | null {
        const EXTS = [".ts", ".tsx", ".js", ".jsx"];
        if (path.extname(filePath) && fs.existsSync(filePath)) return filePath;
        for (const ext of EXTS) {
            const c = filePath + ext;
            if (fs.existsSync(c)) return c;
        }
        return null;
    }
}
