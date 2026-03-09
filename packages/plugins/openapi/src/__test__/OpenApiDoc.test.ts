import path from "path";
import fs from "fs";
import os from "os";
import { OpenApiDoc } from "../index";
import type { NodeReturn } from "@auto-docs/core";

function makeMeta(meta: Record<string, unknown>): string {
    return `AUTO_DOCS_META:${JSON.stringify(meta)}`;
}

function makeTree(descriptionOverride?: string): NodeReturn {
    return {
        type: "call",
        value: "getUser",
        description: descriptionOverride,
        children: [
            {
                type: "object",
                value: "return body",
                children: [],
            },
        ],
    };
}

describe("OpenApiDoc", () => {
    describe("T017: constructor accepts options", () => {
        it("constructs without error with outputDir and version", () => {
            const plugin = new OpenApiDoc({ outputDir: "/tmp/out", version: "3.0.0" });
            expect(plugin).toBeDefined();
            expect(plugin.type).toBe("openApi");
        });

        it("constructs without arguments using defaults", () => {
            const plugin = new OpenApiDoc();
            expect(plugin).toBeDefined();
        });

        it("exposes opts via getters", () => {
            const plugin = new OpenApiDoc({ outputDir: "/tmp/docs", version: "1.2.3" });
            expect((plugin as any).opts.outputDir).toBe("/tmp/docs");
            expect((plugin as any).opts.version).toBe("1.2.3");
        });
    });

    describe("T018: onAnalysis with AUTO_DOCS_META", () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "autodocs-test-"));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it("produces an OpenAPI path item for GET /users from META", () => {
            const plugin = new OpenApiDoc({ outputDir: tmpDir, version: "3.0.0" });

            const tree = makeTree(
                makeMeta({ httpMethod: "GET", httpPath: "/users" })
            );

            plugin.onAnalysis?.([tree]);

            const specPath = path.join(tmpDir, "openapi.json");
            expect(fs.existsSync(specPath)).toBe(true);

            const spec = JSON.parse(fs.readFileSync(specPath, "utf-8"));
            expect(spec.paths["/users"]).toBeDefined();
            expect(spec.paths["/users"]["get"]).toBeDefined();
        });

        it("multiple onAnalysis calls accumulate paths", () => {
            const plugin = new OpenApiDoc({ outputDir: tmpDir });

            plugin.onAnalysis?.([makeTree(makeMeta({ httpMethod: "GET", httpPath: "/users" }))]);
            plugin.onAnalysis?.([makeTree(makeMeta({ httpMethod: "POST", httpPath: "/users" }))]);
            plugin.flush?.();

            const spec = JSON.parse(fs.readFileSync(path.join(tmpDir, "openapi.json"), "utf-8"));
            expect(spec.paths["/users"]["get"]).toBeDefined();
            expect(spec.paths["/users"]["post"]).toBeDefined();
        });
    });

    describe("T019: onAnalysis without META does not throw", () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "autodocs-test-"));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it("does not throw when description has no AUTO_DOCS_META", () => {
            const plugin = new OpenApiDoc({ outputDir: tmpDir });
            const tree = makeTree("just a plain function description");

            expect(() => plugin.onAnalysis?.([tree])).not.toThrow();
        });

        it("does not throw when description is undefined", () => {
            const plugin = new OpenApiDoc({ outputDir: tmpDir });
            const tree = makeTree(undefined);

            expect(() => plugin.onAnalysis?.([tree])).not.toThrow();
        });

        it("does not write a spec when no META is present", () => {
            const plugin = new OpenApiDoc({ outputDir: tmpDir });
            plugin.onAnalysis?.([makeTree(undefined)]);

            // No spec written for a tree with no route metadata
            const specPath = path.join(tmpDir, "openapi.json");
            expect(fs.existsSync(specPath)).toBe(false);
        });
    });
});
