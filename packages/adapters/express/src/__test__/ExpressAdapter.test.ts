import path from "path";
import { ExpressAdapter } from "../ExpressAdapter";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const ROUTER_FIXTURE = path.join(FIXTURES_DIR, "router.ts");

describe("ExpressAdapter", () => {
    // T061 — basic route discovery
    describe("T061: resolves GET /users route", () => {
        it("returns an EntryPoint for router.get('/users', getUsers)", () => {
            const adapter = new ExpressAdapter({ routerPath: ROUTER_FIXTURE });
            const entries = adapter.resolveEntryPoints();
            const getUsers = entries.find((e) => e.functionName === "getUsers");
            expect(getUsers).toBeDefined();
            expect(getUsers!.metadata?.httpMethod).toBe("GET");
            expect(getUsers!.metadata?.httpPath).toBe("/users");
        });

        it("resolves three routes from the fixture router", () => {
            const adapter = new ExpressAdapter({ routerPath: ROUTER_FIXTURE });
            const entries = adapter.resolveEntryPoints();
            expect(entries).toHaveLength(3);
        });
    });

    // T062 — handler file path resolved through import map
    describe("T062: filePath resolves to the imported handler file", () => {
        it("getUsers filePath points to handlers/users.ts not router.ts", () => {
            const adapter = new ExpressAdapter({ routerPath: ROUTER_FIXTURE });
            const entries = adapter.resolveEntryPoints();
            const getUsers = entries.find((e) => e.functionName === "getUsers");
            expect(getUsers!.filePath).toContain("handlers");
            expect(getUsers!.filePath).toContain("users");
            expect(getUsers!.filePath).not.toContain("router");
        });

        it("resolved filePath is absolute", () => {
            const adapter = new ExpressAdapter({ routerPath: ROUTER_FIXTURE });
            const entries = adapter.resolveEntryPoints();
            for (const entry of entries) {
                expect(path.isAbsolute(entry.filePath)).toBe(true);
            }
        });
    });

    // T063 — three different HTTP methods
    describe("T063: three routes with distinct HTTP methods", () => {
        it("returns entries with GET, POST, DELETE methods", () => {
            const adapter = new ExpressAdapter({ routerPath: ROUTER_FIXTURE });
            const entries = adapter.resolveEntryPoints();
            const methods = entries.map((e) => e.metadata?.httpMethod as string);
            expect(methods).toContain("GET");
            expect(methods).toContain("POST");
            expect(methods).toContain("DELETE");
        });
    });
});
