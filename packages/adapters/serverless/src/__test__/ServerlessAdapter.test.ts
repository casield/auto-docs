import path from "path";
import { ServerlessAdapter } from "../ServerlessAdapter";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const FIXTURE_SLS = path.join(FIXTURES_DIR, "serverless.yml");
const FIXTURE_MISSING_SLS = path.join(FIXTURES_DIR, "serverless-missing.yml");

describe("ServerlessAdapter", () => {
    // T040 — resolveEntryPoints returns correct filePath and functionName
    describe("T040: resolveEntryPoints from valid serverless.yml", () => {
        it("returns an EntryPoint for each declared function", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            expect(entries).toHaveLength(2);
        });

        it("resolves the handler file path to an absolute .ts path", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const getUser = entries.find((e) => e.functionName === "getUser");
            expect(getUser).toBeDefined();
            expect(path.isAbsolute(getUser!.filePath)).toBe(true);
            expect(getUser!.filePath.endsWith(path.join("src", "users.ts"))).toBe(
                true
            );
        });

        it("sets the correct functionName from the handler declaration", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const getUser = entries.find((e) => e.functionName === "getUser");
            expect(getUser!.functionName).toBe("getUser");
        });
    });

    // T041 — metadata extracted from http events
    describe("T041: metadata from http events", () => {
        it("sets httpMethod to uppercase GET for the getUser function", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const getUser = entries.find((e) => e.functionName === "getUser");
            expect(getUser!.metadata?.httpMethod).toBe("GET");
        });

        it("sets httpPath for the getUser function", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const getUser = entries.find((e) => e.functionName === "getUser");
            expect(getUser!.metadata?.httpPath).toBe("/users/{id}");
        });

        it("sets httpMethod to POST for the createOrder function", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const createOrder = entries.find((e) => e.functionName === "createOrder");
            expect(createOrder!.metadata?.httpMethod).toBe("POST");
        });

        it("sets httpPath /orders for the createOrder function", () => {
            const adapter = new ServerlessAdapter({ configPath: FIXTURE_SLS });
            const entries = adapter.resolveEntryPoints();
            const createOrder = entries.find((e) => e.functionName === "createOrder");
            expect(createOrder!.metadata?.httpPath).toBe("/orders");
        });
    });

    // T042 — throws when handler file does not exist
    describe("T042: throws on missing handler file", () => {
        it("throws a descriptive error when the handler file cannot be found", () => {
            const adapter = new ServerlessAdapter({
                configPath: FIXTURE_MISSING_SLS,
            });
            expect(() => adapter.resolveEntryPoints()).toThrow(
                /ServerlessAdapter.*nonexistent/i
            );
        });

        it("error message names the missing file path", () => {
            const adapter = new ServerlessAdapter({
                configPath: FIXTURE_MISSING_SLS,
            });
            expect(() => adapter.resolveEntryPoints()).toThrow(/nonexistent/);
        });
    });
});
