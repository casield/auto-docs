import { MemoryLinker } from "../linkers";
import { VersionControl } from "../VersionControl";

describe("VersionControl", () => {
  it("should detect added, removed, and modified documents", async () => {
    const linker = new MemoryLinker();
    const versionControl = new VersionControl(linker);

    // Simulate pulling documents from two branches
    await linker.link({
      branch: "branchA",
      version: "1.0.0",
      name: "doc1",
      plugin: "plugin" as unknown as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      id: "doc1",
      data: {
        field1: "value1",
        field2: "value2",
      } as AutoDocsTypes.AvailablePlugins,
    });

    await linker.link({
      branch: "branchB",
      version: "1.0.0",
      name: "doc1",
      id: "doc1",
      plugin: "plugin" as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field2: 2,
        field3: "value3",
        field4: "value4",
      } as AutoDocsTypes.AvailablePlugins,
    });

    const diff = await versionControl.getBranchDiff("branchA", "branchB");

    expect(diff).toBeDefined();
    expect(diff.length).toBe(1);
    expect(diff[0].changes).toBeDefined();
    expect(diff[0].changes?.length).toBe(4);

    expect(diff[0].changes?.[0].path).toBe("field1");
    expect(diff[0].changes?.[0].oldValue).toBe("value1");
    expect(diff[0].changes?.[0].newValue).toBeUndefined();

    expect(diff[0].changes?.[1].path).toBe("field2");
    expect(diff[0].changes?.[1].newValue).toBe(2);
    expect(diff[0].changes?.[1].oldValue).toBe("value2");

    expect(diff[0].changes?.[2].path).toBe("field3");
    expect(diff[0].changes?.[2].newValue).toBe("value3");
    expect(diff[0].changes?.[2].oldValue).toBeUndefined();

    expect(diff[0].changes?.[3].path).toBe("field4");
    expect(diff[0].changes?.[3].newValue).toBe("value4");
    expect(diff[0].changes?.[3].oldValue).toBeUndefined();
  });

  it("should merge documents correctly", async () => {
    const linker = new MemoryLinker();
    const versionControl = new VersionControl(linker);

    // Simulate pulling documents from two branches
    await linker.link({
      branch: "branchA",
      version: "1.0.0",
      name: "doc1",
      id: "doc1",
      plugin: "plugin" as unknown as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field1: "value1",
        field2: "value2",
        field3: "value3",
      } as AutoDocsTypes.AvailablePlugins,
    });

    await linker.link({
      branch: "branchB",
      version: "1.0.0",
      name: "doc1",
      id: "doc1",
      plugin: "plugin" as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field2: 2,
        field3: "value-not-in-branchB",
        field4: "value4",
      } as AutoDocsTypes.AvailablePlugins,
    });

    const merge = await versionControl.merge("branchA", "branchB");

    expect(merge).toBeDefined();

    const pull = await linker.pull();

    expect(pull).toBeDefined();
    expect((pull["plugin"][1].data as any).field1).toBe("value1");
    expect((pull["plugin"][1].data as any).field2).toBe("value2");
    expect((pull["plugin"][1].data as any).field3).toBe("value3");
    expect((pull["plugin"][1].data as any).field4).toBe("value4");
  });
});
