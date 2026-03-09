import path from "path";
import { FrameworkAdapter, EntryPoint } from "../../adapters/FrameworkAdapter";
import { AutoDocsPlugin, AutoDocsBuilder } from "../../index";
import type { NodeReturn } from "../../analyzer";

const SCAN_FIXTURES = path.join(
    __dirname,
    "../scanner/fixtures"
);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

class FixtureAdapter extends FrameworkAdapter {
    public resolveEntryPoints(): EntryPoint[] {
        return [
            {
                filePath: "/tmp/src/users.ts",
                functionName: "getUser",
                metadata: { httpMethod: "GET", httpPath: "/users" },
            },
            {
                filePath: "/tmp/src/orders.ts",
                functionName: "createOrder",
                metadata: { httpMethod: "POST", httpPath: "/orders" },
            },
        ];
    }
}

/** Custom adapter that returns a single entry pointing at a real fixture file. */
class SingleEntryAdapter extends FrameworkAdapter {
    constructor(private readonly entryPath: string) {
        super();
    }
    public resolveEntryPoints(): EntryPoint[] {
        return [
            {
                filePath: this.entryPath,
                functionName: "getUser",
                metadata: { httpMethod: "GET", httpPath: "/users" },
            },
        ];
    }
}

class CollectorPlugin extends AutoDocsPlugin<any> {
    public receivedTrees: NodeReturn[][] = [];
    constructor() { super("collector" as any); }
    public onBuild(_docs: any[], _builder: AutoDocsBuilder<any>): any { return {}; }
    public onAnalysis(trees: NodeReturn[]): void { this.receivedTrees.push(trees); }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FrameworkAdapter", () => {
    it("T024: concrete subclass can be instantiated", () => {
        const adapter = new FixtureAdapter();
        expect(adapter).toBeDefined();
    });

    it("T024: resolveEntryPoints returns EntryPoint[]", () => {
        const adapter = new FixtureAdapter();
        const entries = adapter.resolveEntryPoints();
        expect(Array.isArray(entries)).toBe(true);
        expect(entries).toHaveLength(2);
    });

    it("T024: EntryPoint has filePath, functionName, and optional metadata", () => {
        const adapter = new FixtureAdapter();
        const [entry] = adapter.resolveEntryPoints();
        expect(entry.filePath).toBe("/tmp/src/users.ts");
        expect(entry.functionName).toBe("getUser");
        expect(entry.metadata?.httpMethod).toBe("GET");
        expect(entry.metadata?.httpPath).toBe("/users");
    });

    // T068 — custom adapter wired into builder.analyze()
    describe("T068: custom adapter wired through builder.analyze()", () => {
        it("onAnalysis is called when a custom adapter resolves an entry point", async () => {
            const entryFile = path.join(SCAN_FIXTURES, "entry.ts");
            const plugin = new CollectorPlugin();
            const adapter = new SingleEntryAdapter(entryFile);

            const builder = new AutoDocsBuilder({
                name: "test",
                description: "test",
                plugins: [plugin],
                branch: "main",
            });

            await builder.analyze([adapter]);

            expect(plugin.receivedTrees).toHaveLength(1);
        });

        it("root NodeReturn.description embeds metadata from custom adapter", async () => {
            const entryFile = path.join(SCAN_FIXTURES, "entry.ts");
            const plugin = new CollectorPlugin();
            const adapter = new SingleEntryAdapter(entryFile);

            const builder = new AutoDocsBuilder({
                name: "test",
                description: "test",
                plugins: [plugin],
                branch: "main",
            });

            await builder.analyze([adapter]);

            const [trees] = plugin.receivedTrees;
            expect(trees[0].description).toContain("AUTO_DOCS_META:");
        });
    });

    // T069 — multiple adapters
    describe("T069: multiple adapters combined", () => {
        it("onAnalysis is called once per entry point across all adapters", async () => {
            const entryFile = path.join(SCAN_FIXTURES, "entry.ts");
            const plugin = new CollectorPlugin();
            const adapterA = new SingleEntryAdapter(entryFile);
            const adapterB = new SingleEntryAdapter(entryFile);

            const builder = new AutoDocsBuilder({
                name: "test",
                description: "test",
                plugins: [plugin],
                branch: "main",
            });

            await builder.analyze([adapterA, adapterB]);

            // Two adapters × one entry each = two onAnalysis calls.
            expect(plugin.receivedTrees).toHaveLength(2);
        });
    });
});
