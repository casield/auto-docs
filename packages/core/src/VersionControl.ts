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

    for (const key of Array.from(allKeys)) {
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

  /**
   * Merge changes from one branch to another with options for conflict resolution
   * @param sourceBranch - Source branch to merge from
   * @param targetBranch - Target branch to merge into
   * @param conflictResolution - Optional custom function to resolve conflicts
   * @returns A summary of the merge operation
   */
  public async merge(
    sourceBranch: string,
    targetBranch: string,
    conflictResolution?: (
      change: DocumentChange<T>
    ) => AutoDocsTypes.LinkerObject<T> | null
  ): Promise<{
    merged: number;
    skipped: number;
    conflicts: number;
  }> {
    const changes = await this.getBranchDiff(sourceBranch, targetBranch);
    let merged = 0;
    let skipped = 0;
    let conflicts = 0;

    for (const change of changes) {
      switch (change.status) {
        case "added":
          // For added items, simply add them to the target branch
          if (change.objectB) {
            const docToAdd = { ...change.objectB, branch: targetBranch };
            await this.linker.link(docToAdd);
            merged++;
          }
          break;

        case "removed":
          // Skip removed items by default (behavior can be customized)
          skipped++;
          break;

        case "modified":
          if (change.objectA && change.objectB) {
            try {
              // By default, we take objectB (newer version) for the merge
              // If conflict resolution is provided, let it decide how to handle the merge
              let resolvedDoc: AutoDocsTypes.LinkerObject<T> | null = null;

              if (conflictResolution) {
                resolvedDoc = conflictResolution(change);
              } else {
                // Default resolution: take the newer version (objectB)
                resolvedDoc = { ...change.objectB, branch: targetBranch };
              }

              if (resolvedDoc) {
                await this.linker.link(resolvedDoc);
                merged++;
              } else {
                // If conflict resolver returns null, skip this document
                skipped++;
              }
            } catch (error) {
              // Mark as conflict if resolution fails
              conflicts++;
            }
          }
          break;
      }
    }

    return { merged, skipped, conflicts };
  }

  /**
   * Apply specific changes to an object based on a list of attribute changes
   * @param obj - The base object to apply changes to
   * @param changes - List of attribute changes to apply
   * @returns A new object with changes applied
   */
  public applyChanges<D>(obj: D, changes: AttributeChange[]): D {
    // Create a deep copy of the original object
    const result: D = JSON.parse(JSON.stringify(obj));

    for (const change of changes) {
      // Skip empty paths
      if (!change.path || change.path === "root") {
        return change.newValue as D;
      }

      // Parse the path
      const pathParts = change.path.split(".");
      let current: any = result;

      // Navigate to the parent of the property we want to change
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];

        // Handle array indices in the path (e.g., "items[0]")
        const arrayMatch = part.match(/^(.*)\[(\d+)\]$/);
        if (arrayMatch) {
          const [_, arrayName, indexStr] = arrayMatch;
          const index = parseInt(indexStr, 10);

          if (!current[arrayName]) {
            current[arrayName] = [];
          }

          if (!current[arrayName][index]) {
            current[arrayName][index] = {};
          }

          current = current[arrayName][index];
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }

      // Get the final property name to set
      const lastPart = pathParts[pathParts.length - 1];

      // Handle array index in the last part of the path
      const arrayMatch = lastPart.match(/^(.*)\[(\d+)\]$/);
      if (arrayMatch) {
        const [_, arrayName, indexStr] = arrayMatch;
        const index = parseInt(indexStr, 10);

        if (!current[arrayName]) {
          current[arrayName] = [];
        }

        current[arrayName][index] = change.newValue;
      } else {
        current[lastPart] = change.newValue;
      }
    }

    return result;
  }

  /**
   * Create a three-way merge of documents using a common ancestor
   * @param base - The common ancestor document
   * @param docA - The first document to merge
   * @param docB - The second document to merge
   * @returns A newly merged document or null if there are conflicts
   */
  public mergeDocuments<D>(base: D, docA: D, docB: D): D | null {
    const changesA = this.compareObjects(base, docA);
    const changesB = this.compareObjects(base, docB);

    // Check for conflicts (same paths modified differently)
    const conflictPaths = new Set<string>();

    changesA.forEach((changeA) => {
      const conflictingChangeB = changesB.find(
        (changeB) =>
          changeB.path === changeA.path &&
          JSON.stringify(changeB.newValue) !== JSON.stringify(changeA.newValue)
      );

      if (conflictingChangeB) {
        conflictPaths.add(changeA.path);
      }
    });

    if (conflictPaths.size > 0) {
      // Conflicts detected, return null
      return null;
    }

    // No conflicts, apply both sets of changes
    const result = this.applyChanges(base, changesA);
    return this.applyChanges(result, changesB);
  }
}
