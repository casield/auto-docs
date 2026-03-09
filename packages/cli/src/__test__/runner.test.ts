import path from "path";
import { loadConfig, run } from "../runner";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const VALID_PROJECT = path.join(FIXTURES_DIR, "valid-project");
const EMPTY_PROJECT = path.join(FIXTURES_DIR, "empty-project");
const SYNTAX_ERROR_PROJECT = path.join(FIXTURES_DIR, "syntax-error-project");

describe("loadConfig", () => {
    // T048 — loads a valid config
    describe("T048: valid autodocs.config.ts", () => {
        it("returns a config object with name and branch", async () => {
            const config = await loadConfig(VALID_PROJECT);
            expect(config).toBeDefined();
            expect(config.name).toBe("Test Project");
            expect(config.branch).toBe("main");
        });

        it("returns a config object with plugins array", async () => {
            const config = await loadConfig(VALID_PROJECT);
            expect(Array.isArray(config.plugins)).toBe(true);
        });
    });

    // T049 — throws when no config file exists
    describe("T049: missing config file", () => {
        it("throws an error when no autodocs.config.ts exists", async () => {
            await expect(loadConfig(EMPTY_PROJECT)).rejects.toThrow();
        });

        it("error message guides user to create a config file", async () => {
            await expect(loadConfig(EMPTY_PROJECT)).rejects.toThrow(
                /autodocs\.config/i
            );
        });
    });

    // T050 — throws on syntax error
    describe("T050: syntax error in config", () => {
        it("throws when config has a syntax error", async () => {
            await expect(loadConfig(SYNTAX_ERROR_PROJECT)).rejects.toThrow();
        });

        it("error message references the config file path", async () => {
            await expect(loadConfig(SYNTAX_ERROR_PROJECT)).rejects.toThrow(
                /autodocs\.config/i
            );
        });
    });
});

describe("run", () => {
    it("T052: completes without error given a valid minimal config", async () => {
        const config = await loadConfig(VALID_PROJECT);
        await expect(run(config)).resolves.not.toThrow();
    });
});
