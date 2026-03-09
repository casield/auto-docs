import fs from "fs";
import path from "path";
import { CodeAnalyzer } from "../analyzer/CodeAnalyzer";
import type { CodeAnalysisResult } from "../analyzer/CallTreeBuilder";

/**
 * Known source file extensions to try when resolving bare import paths.
 */
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];

/**
 * Resolve a file path to its actual on-disk path by trying known extensions.
 * Returns `null` if no matching file is found.
 */
function resolveWithExtension(filePath: string): string | null {
    // If the path already has an extension and exists, use it as-is.
    if (path.extname(filePath) && fs.existsSync(filePath)) {
        return filePath;
    }

    // Try appending known extensions.
    for (const ext of EXTENSIONS) {
        const candidate = filePath + ext;
        if (fs.existsSync(candidate)) return candidate;
    }

    // Try replacing the existing extension with each known extension.
    if (path.extname(filePath)) {
        for (const ext of EXTENSIONS) {
            const candidate = filePath.replace(/\.\w+$/, ext);
            if (fs.existsSync(candidate)) return candidate;
        }
    }

    return null;
}

/**
 * BFS file-graph scanner that discovers and analyzes all source files
 * reachable from an entry point via import declarations.
 *
 * @example
 * ```ts
 * const scanner = new FileGraphScanner();
 * const results = scanner.scan("/src/handlers/getUser.ts");
 * // results contains CodeAnalysisResult for getUser.ts and all its imports
 * ```
 */
export class FileGraphScanner {
    /**
     * Scan the import graph starting from `entryFilePath`.
     *
     * Performs a BFS traversal: for each file, parses it with `CodeAnalyzer`,
     * collects return-analysis data, and enqueues the resolved import targets.
     *
     * @param entryFilePath - Absolute path to the entry handler file.
     * @returns Ordered list of `CodeAnalysisResult` — one per unique file visited.
     */
    scan(entryFilePath: string): CodeAnalysisResult[] {
        const resolved = resolveWithExtension(entryFilePath);
        if (!resolved) return [];

        const results: CodeAnalysisResult[] = [];
        const visited = new Set<string>();
        const queue: string[] = [resolved];

        while (queue.length > 0) {
            const filePath = queue.shift()!;

            if (visited.has(filePath)) continue;
            visited.add(filePath);

            let source: string;
            try {
                source = fs.readFileSync(filePath, "utf-8");
            } catch {
                // Skip files that cannot be read.
                continue;
            }

            const analyzer = new CodeAnalyzer(filePath, {
                resolvePath: (importPath: string, fileName: string): string | null => {
                    // Only follow relative imports; skip node_modules and builtins.
                    if (!importPath.startsWith(".")) return null;
                    const base = path.resolve(path.dirname(fileName), importPath);
                    return resolveWithExtension(base);
                },
            });

            const analysis = analyzer.analyzeSource(source);

            results.push({
                fileName: filePath,
                analysis,
                importMap: analyzer.importMap,
            });

            // Enqueue unique resolved file paths discovered through imported symbols.
            const seenNextFiles = new Set<string>();
            for (const rawNextFile of Object.values(analyzer.importMap)) {
                // Only follow absolute paths — relative or package names are skipped.
                if (!path.isAbsolute(rawNextFile)) continue;

                // CodeAnalyzer may omit file extensions; resolve them now.
                const nextFile = resolveWithExtension(rawNextFile) ?? rawNextFile;

                if (
                    !seenNextFiles.has(nextFile) &&
                    !visited.has(nextFile) &&
                    fs.existsSync(nextFile)
                ) {
                    seenNextFiles.add(nextFile);
                    queue.push(nextFile);
                }
            }
        }

        return results;
    }
}
