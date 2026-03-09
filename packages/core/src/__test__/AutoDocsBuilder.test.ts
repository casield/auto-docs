import { AutoDocsBuilder } from "../index";
import { AutoDocsPlugin } from "../Plugin";
import { FrameworkAdapter, EntryPoint } from "../adapters/FrameworkAdapter";
import type { NodeReturn } from "../analyzer";

/** A minimal concrete plugin — overrides onBuild to avoid throwing. */
class TestPlugin extends AutoDocsPlugin<any> {
    public onInitCalled = false;

    constructor() {
        super("testPlugin" as any);
    }

    public onBuild(_docs: any[], _builder: AutoDocsBuilder<any>): any {
        return {};
    }

    public onInit(builder: AutoDocsBuilder<any>): void {
        this.onInitCalled = true;
        super.onInit(builder);
    }
}

describe("AutoDocsBuilder", () => {
    it("T008: accepts plugin INSTANCES in config.plugins and calls onInit for each", () => {
        const plugin = new TestPlugin();

        // After refactor: config.plugins is AutoDocsPlugin<any>[] (instances, not classes)
        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [plugin],
            branch: "main",
        });

        expect(builder).toBeDefined();
        expect(plugin.onInitCalled).toBe(true);
    });

    it("T008: multiple instances — onInit called for each", () => {
        const p1 = new TestPlugin();
        const p2 = new TestPlugin();

        new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [p1, p2],
            branch: "main",
        });

        expect(p1.onInitCalled).toBe(true);
        expect(p2.onInitCalled).toBe(true);
    });

    it("T009: config without pluginConfig compiles and constructs without error", () => {
        // After refactor pluginConfig is removed from AutoDocsConfig — no field needed
        const config: AutoDocsTypes.AutoDocsConfig<any> = {
            name: "test",
            description: "test",
            plugins: [],
            branch: "main",
        };

        expect(() => new AutoDocsBuilder(config)).not.toThrow();
    });

    it("T009: empty plugins array — no error, no initPlugins call", () => {
        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [],
            branch: "main",
        });
        expect(builder).toBeDefined();
    });
});

// ──────────────────────────────────────────────────────────────────────────────
// T028 — AutoDocsBuilder.analyze()
// ──────────────────────────────────────────────────────────────────────────────

import path from "path";

class AnalysisCollectorPlugin extends AutoDocsPlugin<any> {
    public receivedTrees: NodeReturn[][] = [];

    constructor() {
        super("collector" as any);
    }

    public onBuild(_docs: any[], _builder: AutoDocsBuilder<any>): any {
        return {};
    }

    public onAnalysis(trees: NodeReturn[]): void {
        this.receivedTrees.push(trees);
    }
}

class MockAdapter extends FrameworkAdapter {
    public resolveEntryPoints(): EntryPoint[] {
        return [
            {
                // Point at a real fixture file so FileGraphScanner can read it
                filePath: path.join(
                    __dirname,
                    "scanner/fixtures/entry.ts"
                ),
                functionName: "getUser",
                metadata: { httpMethod: "GET", httpPath: "/users" },
            },
        ];
    }
}

describe("AutoDocsBuilder.analyze()", () => {
    it("T028: calls resolveEntryPoints on the provided adapter", async () => {
        const adapter = new MockAdapter();
        const spy = jest.spyOn(adapter, "resolveEntryPoints");

        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [],
            branch: "main",
        });

        await builder.analyze([adapter]);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("T028: calls plugin.onAnalysis once per resolved entry point", async () => {
        const plugin = new AnalysisCollectorPlugin();
        const adapter = new MockAdapter();

        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [plugin],
            branch: "main",
        });

        await builder.analyze([adapter]);

        // One entry point → onAnalysis called once
        expect(plugin.receivedTrees).toHaveLength(1);
    });

    it("T028: root NodeReturn.description contains AUTO_DOCS_META with entry metadata", async () => {
        const plugin = new AnalysisCollectorPlugin();
        const adapter = new MockAdapter();

        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [plugin],
            branch: "main",
        });

        await builder.analyze([adapter]);

        const [trees] = plugin.receivedTrees;
        expect(trees[0]).toBeDefined();
        expect(trees[0].description).toContain("AUTO_DOCS_META:");
        const meta = JSON.parse(trees[0].description!.split("AUTO_DOCS_META:")[1]);
        expect(meta.httpMethod).toBe("GET");
        expect(meta.httpPath).toBe("/users");
    });

    it("T028: plugin without onAnalysis is silently skipped (no throw)", async () => {
        const plugin = new TestPlugin();
        const adapter = new MockAdapter();

        const builder = new AutoDocsBuilder({
            name: "test",
            description: "test",
            plugins: [plugin],
            branch: "main",
        });

        await expect(builder.analyze([adapter])).resolves.not.toThrow();
    });
});
