import path from "path";
import { FileGraphScanner } from "../../scanner/FileGraphScanner";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const ENTRY_FIXTURE = path.join(FIXTURES_DIR, "entry.ts");

describe("FileGraphScanner", () => {
    it("T027: scan returns CodeAnalysisResult for the entry file", () => {
        const scanner = new FileGraphScanner();
        const results = scanner.scan(ENTRY_FIXTURE);
        expect(results.length).toBeGreaterThanOrEqual(1);
        const fileNames = results.map((r) => path.basename(r.fileName));
        expect(fileNames).toContain("entry.ts");
    });

    it("T027: scan follows imports and includes the imported helper", () => {
        const scanner = new FileGraphScanner();
        const results = scanner.scan(ENTRY_FIXTURE);
        const fileNames = results.map((r) => path.basename(r.fileName).replace(/\.(ts|js)$/, ""));
        // Should contain both entry and helper
        expect(fileNames).toContain("entry");
        expect(fileNames).toContain("helper");
    });

    it("T027: no duplicate CodeAnalysisResult for the same file", () => {
        const scanner = new FileGraphScanner();
        const results = scanner.scan(ENTRY_FIXTURE);
        const fileNames = results.map((r) => r.fileName);
        const uniqueNames = new Set(fileNames);
        expect(uniqueNames.size).toBe(fileNames.length);
    });

    it("T027: each result has fileName, analysis, and importMap", () => {
        const scanner = new FileGraphScanner();
        const results = scanner.scan(ENTRY_FIXTURE);
        for (const result of results) {
            expect(result.fileName).toBeDefined();
            expect(result.analysis).toBeDefined();
            expect(result.importMap).toBeDefined();
        }
    });
});
