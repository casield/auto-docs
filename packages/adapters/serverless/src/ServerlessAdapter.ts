import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { FrameworkAdapter, EntryPoint } from "@auto-docs/core";

// ---------------------------------------------------------------------------
// Serverless Framework YAML shape (minimal typing)
// ---------------------------------------------------------------------------

interface ServerlessFunctionHttpEvent {
    method: string;
    path: string;
}

interface ServerlessEvent {
    http?: ServerlessFunctionHttpEvent;
    httpApi?: ServerlessFunctionHttpEvent;
}

interface ServerlessFunction {
    handler: string;
    events?: ServerlessEvent[];
}

interface ServerlessConfig {
    functions?: Record<string, ServerlessFunction>;
}

// ---------------------------------------------------------------------------

export interface ServerlessAdapterOptions {
    /** Absolute (or resolvable) path to the `serverless.yml` configuration file. */
    configPath: string;
}

/**
 * Resolves handler entry points from a Serverless Framework `serverless.yml`.
 *
 * Each `functions.<name>.handler` value is split on the **last** `.` to
 * separate the file path from the exported function name.  The adapter
 * tries `.ts` and then `.js` extensions and throws if neither exists.
 *
 * HTTP metadata (`httpMethod`, `httpPath`) is extracted from the first
 * `http` or `httpApi` event declared for the function.
 *
 * @example
 * ```ts
 * const adapter = new ServerlessAdapter({ configPath: 'serverless.yml' });
 * const entries = adapter.resolveEntryPoints();
 * // → [{ filePath: '/abs/src/users.ts', functionName: 'getUser', metadata: { httpMethod: 'GET', httpPath: '/users/{id}' } }]
 * ```
 */
export class ServerlessAdapter extends FrameworkAdapter {
    constructor(private readonly opts: ServerlessAdapterOptions) {
        super();
    }

    resolveEntryPoints(): EntryPoint[] {
        const configDir = path.dirname(path.resolve(this.opts.configPath));
        const raw = fs.readFileSync(this.opts.configPath, "utf-8");
        const config = yaml.load(raw) as ServerlessConfig;

        const functions = config.functions ?? {};
        return Object.entries(functions).map(([fnName, fn]) =>
            this.parseFunction(fnName, fn, configDir)
        );
    }

    private parseFunction(
        fnName: string,
        fn: ServerlessFunction,
        configDir: string
    ): EntryPoint {
        // Split on the last '.' to separate filePath from functionName.
        const lastDot = fn.handler.lastIndexOf(".");
        if (lastDot === -1) {
            throw new Error(
                `[ServerlessAdapter] Invalid handler format for function "${fnName}": "${fn.handler}". ` +
                `Expected "path/to/file.functionName".`
            );
        }

        const handlerRelPath = fn.handler.substring(0, lastDot);
        const functionName = fn.handler.substring(lastDot + 1);

        // Try to resolve the file with .ts then .js extension.
        const tsPath = path.resolve(configDir, handlerRelPath + ".ts");
        const jsPath = path.resolve(configDir, handlerRelPath + ".js");

        let filePath: string;
        if (fs.existsSync(tsPath)) {
            filePath = tsPath;
        } else if (fs.existsSync(jsPath)) {
            filePath = jsPath;
        } else {
            throw new Error(
                `[ServerlessAdapter] Handler file not found for function "${fnName}": ` +
                `tried "${tsPath}" and "${jsPath}". ` +
                `Ensure the file exists or check your handler declaration in serverless.yml.`
            );
        }

        // Extract HTTP metadata from the first http/httpApi event.
        const metadata = this.extractMetadata(fn.events ?? []);

        return {
            filePath,
            functionName,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        };
    }

    private extractMetadata(
        events: ServerlessEvent[]
    ): Record<string, unknown> {
        for (const event of events) {
            const httpEvent = event.http ?? event.httpApi;
            if (httpEvent) {
                return {
                    httpMethod: httpEvent.method.toUpperCase(),
                    httpPath: httpEvent.path.startsWith("/")
                        ? httpEvent.path
                        : `/${httpEvent.path}`,
                };
            }
        }
        return {};
    }
}
