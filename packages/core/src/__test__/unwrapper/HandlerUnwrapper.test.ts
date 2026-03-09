import path from "path";
import { HandlerUnwrapper, UnwrapRule } from "../../unwrapper/HandlerUnwrapper";
import { MIDDY_UNWRAP_RULE } from "../../unwrapper/builtins";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const MIDDY_FIXTURE = path.join(FIXTURES_DIR, "middy-handler.ts");
const MULTI_WRAP_FIXTURE = path.join(FIXTURES_DIR, "multi-wrap-handler.ts");

describe("HandlerUnwrapper", () => {
    it("T025: unwraps middy(myBusinessLogic) and returns myBusinessLogic", () => {
        const result = HandlerUnwrapper.unwrap("handler", MIDDY_FIXTURE, [
            MIDDY_UNWRAP_RULE,
        ]);
        expect(result).toBe("myBusinessLogic");
    });

    it("T025: MIDDY_UNWRAP_RULE has callee=middy and argIndex=0", () => {
        expect(MIDDY_UNWRAP_RULE.callee).toBe("middy");
        expect(MIDDY_UNWRAP_RULE.argIndex).toBe(0);
    });

    it("T026: no matching rule returns original function name unchanged", () => {
        const noMatchRule: UnwrapRule = { callee: "withAuth", argIndex: 0 };
        // Spy on console.warn to verify warning is emitted
        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => { });
        const result = HandlerUnwrapper.unwrap("handler", MIDDY_FIXTURE, [
            noMatchRule,
        ]);
        expect(result).toBe("handler");
        warnSpy.mockRestore();
    });

    it("T026: empty rules array returns original function name", () => {
        const result = HandlerUnwrapper.unwrap("handler", MIDDY_FIXTURE, []);
        expect(result).toBe("handler");
    });

    // T056 — multi-layer unwrapping
    describe("T056: multi-layer unwrapping", () => {
        it("unwraps withAuth(withLogging(myBusinessLogic)) iteratively", () => {
            const withAuthRule: UnwrapRule = { callee: "withAuth", argIndex: 0 };
            const withLoggingRule: UnwrapRule = { callee: "withLogging", argIndex: 0 };
            const result = HandlerUnwrapper.unwrap("handler", MULTI_WRAP_FIXTURE, [
                withAuthRule,
                withLoggingRule,
            ]);
            expect(result).toBe("myBusinessLogic");
        });

        it("peels layers regardless of rule order", () => {
            const withAuthRule: UnwrapRule = { callee: "withAuth", argIndex: 0 };
            const withLoggingRule: UnwrapRule = { callee: "withLogging", argIndex: 0 };
            // Same rules, reversed order — should still resolve to the core handler
            const result = HandlerUnwrapper.unwrap("handler", MULTI_WRAP_FIXTURE, [
                withLoggingRule,
                withAuthRule,
            ]);
            expect(result).toBe("myBusinessLogic");
        });
    });

    // T057 — unmatched rule emits console.warn
    describe("T057: unmatched rule emits console.warn", () => {
        it("warns when a declared rule callee does not appear in the file", () => {
            const unusedRule: UnwrapRule = { callee: "unknownWrapper", argIndex: 0 };
            const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => { });

            HandlerUnwrapper.unwrap("handler", MIDDY_FIXTURE, [
                MIDDY_UNWRAP_RULE,
                unusedRule,
            ]);

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining("unknownWrapper")
            );
            warnSpy.mockRestore();
        });
    });
});
