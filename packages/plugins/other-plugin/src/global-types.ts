import "@auto-docs/core";

declare global {
  export namespace AutoDocsTypes {
    export interface IOtherApi extends IDocs {
      other2: string;
    }
    export interface Plugins {
      other: IOtherApi;
    }
  }
}
