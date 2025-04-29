export type ChangeStatus = "added" | "removed" | "modified";

export interface AttributeChange {
  path: string;
  oldValue: any;
  newValue: any;
}

export interface DocumentChange<T extends keyof AutoDocsTypes.Plugins> {
  status: ChangeStatus;
  name: string;
  objectA?: AutoDocsTypes.LinkerObject<T>; // Source object (might be undefined for added items)
  objectB?: AutoDocsTypes.LinkerObject<T>; // Target object (might be undefined for removed items)
  changes?: AttributeChange[]; // Only for modified items
}

export class VersionControl<T extends keyof AutoDocsTypes.Plugins> {
  constructor(public linker: AutoDocsTypes.ILinker<T>) {}

  public async getBranchDiff(
    branchA: string,
    branchB: string
  ): Promise<DocumentChange<T>[]> {
    const docsA = (await this.linker.pull())[branchA] || [];
    const docsB = (await this.linker.pull())[branchB] || [];

    const changes: DocumentChange<T>[] = [];

    // Find added items
    docsB.forEach((docB) => {
      if (!docsA.some((docA) => docA.name === docB.name)) {
        changes.push({
          status: "added",
          name: docB.name,
          objectB: docB,
        });
      }
    });

    // Find removed items
    docsA.forEach((docA) => {
      if (!docsB.some((docB) => docB.name === docA.name)) {
        changes.push({
          status: "removed",
          name: docA.name,
          objectA: docA,
        });
      }
    });

    // Find modified items and detect specific changes
    docsA.forEach((docA) => {
      const docB = docsB.find((d) => d.name === docA.name);
      if (docB && JSON.stringify(docB.data) !== JSON.stringify(docA.data)) {
        const attributeChanges = this.compareObjects(docA.data, docB.data);

        changes.push({
          status: "modified",
          name: docA.name,
          objectA: docA,
          objectB: docB,
          changes: attributeChanges,
        });
      }
    });

    return changes;
  }

  /**
   * Compare two objects and return a list of specific attribute changes
   * with their paths using dot notation
   */
  private compareObjects(objA: any, objB: any, path = ""): AttributeChange[] {
    if (objA === objB) return [];

    const changes: AttributeChange[] = [];

    // For primitives or completely different type replacements
    if (
      typeof objA !== "object" ||
      typeof objB !== "object" ||
      objA === null ||
      objB === null ||
      Array.isArray(objA) !== Array.isArray(objB)
    ) {
      return [
        {
          path: path || "root",
          oldValue: objA,
          newValue: objB,
        },
      ];
    }

    // Handle arrays
    if (Array.isArray(objA) && Array.isArray(objB)) {
      if (objA.length !== objB.length) {
        changes.push({
          path: path || "root",
          oldValue: objA,
          newValue: objB,
        });
      } else {
        // Compare array elements
        for (let i = 0; i < objA.length; i++) {
          const itemPath = path ? `${path}[${i}]` : `[${i}]`;
          changes.push(...this.compareObjects(objA[i], objB[i], itemPath));
        }
      }
      return changes;
    }

    // Handle objects
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;

      // Key exists in both objects
      if (key in objA && key in objB) {
        changes.push(...this.compareObjects(objA[key], objB[key], currentPath));
      }
      // Key only in objA
      else if (key in objA) {
        changes.push({
          path: currentPath,
          oldValue: objA[key],
          newValue: undefined,
        });
      }
      // Key only in objB
      else {
        changes.push({
          path: currentPath,
          oldValue: undefined,
          newValue: objB[key],
        });
      }
    }

    return changes;
  }

  public async merge(
    branchA: string,
    branchB: string,
    custom: () => AutoDocsTypes.LinkerObject<T>[]
  ): Promise<void> {
    const changes = await this.getBranchDiff(branchA, branchB);
    // ...existing code...
  }
}
