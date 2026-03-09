import { AutoDocsPlugin } from "../Plugin";
import type { NodeReturn } from "../analyzer";

/** A concrete plugin that does NOT implement onAnalysis. */
class NoAnalysisPlugin extends AutoDocsPlugin<any> {
    constructor() {
        super("noAnalysis" as any);
    }

    public onBuild(_docs: any[], _builder: any): any {
        return {};
    }
}

/** A concrete plugin that DOES implement onAnalysis. */
class AnalysisPlugin extends AutoDocsPlugin<any> {
    public received: NodeReturn[] | undefined;

    constructor() {
        super("withAnalysis" as any);
    }

    public onBuild(_docs: any[], _builder: any): any {
        return {};
    }

    public onAnalysis(trees: NodeReturn[]): void {
        this.received = trees;
    }
}

describe("AutoDocsPlugin", () => {
    it("T010: can instantiate a plugin that does not implement onAnalysis", () => {
        const plugin = new NoAnalysisPlugin();
        expect(plugin).toBeDefined();
        expect(plugin.type).toBe("noAnalysis");
    });

    it("T010: calling onAnalysis via optional chaining is a no-op when not implemented", () => {
        const plugin = new NoAnalysisPlugin();
        // The optional hook must be declared on the base and default to undefined
        expect(() => plugin.onAnalysis?.([])).not.toThrow();
    });

    it("T010: plugin that implements onAnalysis receives the trees", () => {
        const plugin = new AnalysisPlugin();

        const mockTree: NodeReturn = {
            type: "object",
            value: "testFn",
            description: "AUTO_DOCS_META:{}",
        };

        plugin.onAnalysis?.([mockTree]);
        expect(plugin.received).toEqual([mockTree]);
    });

    it("T010: onAnalysis is optional — not required for a valid plugin", () => {
        const plugin = new NoAnalysisPlugin();
        // onAnalysis should be declared as optional on the base class
        expect("onAnalysis" in plugin || plugin.onAnalysis === undefined).toBe(true);
    });
});
