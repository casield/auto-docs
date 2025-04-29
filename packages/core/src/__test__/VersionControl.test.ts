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
      plugin: undefined as unknown as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field1: "value1",
        field2: "value2",
      } as AutoDocsTypes.AvailablePlugins,
    });

    await linker.link({
      branch: "branchB",
      version: "1.0.0",
      name: "doc1",
      plugin: "pluginA" as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field2: 2,
        field3: "value1",
        field4: "value2",
      } as AutoDocsTypes.AvailablePlugins,
    });

    const diff = await versionControl.getBranchDiff("branchA", "branchB");

    console.log(JSON.stringify(diff, null, 2));

    expect(diff).toBeDefined();
    expect(diff.length).toBe(1);
    expect(diff[0].changes).toBeDefined();
    expect(diff[0].changes?.length).toBe(4);
  });

  it.only("should merge documents correctly", async () => {
    const linker = new MemoryLinker();
    const versionControl = new VersionControl(linker);

    // Simulate pulling documents from two branches
    await linker.link({
      branch: "branchA",
      version: "1.0.0",
      name: "doc1",
      plugin: "plugin" as unknown as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field1: "value1",
        field2: "value2",
      } as AutoDocsTypes.AvailablePlugins,
    });

    await linker.link({
      branch: "branchB",
      version: "1.0.0",
      name: "doc1",
      plugin: "plugin" as AutoDocsTypes.AvailablePlugins,
      description: "Document 1",
      data: {
        field2: 2,
        field3: "value3",
        field4: "value4",
      } as AutoDocsTypes.AvailablePlugins,
    });

    const merge = await versionControl.merge("branchA", "branchB");

    console.log(JSON.stringify(merge, null, 2));

    expect(merge).toBeDefined();

    const pull = await linker.pull();

    expect(pull).toBeDefined();
    console.log(JSON.stringify(pull, null, 2));
  });
});
