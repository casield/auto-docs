import "@drokt/core/src/types";

declare global {
  export namespace DroktTypes {
    export interface IOtherApi extends IDocs {
      other2: string;
    }
    export interface Plugins {
      other: IOtherApi;
    }
  }
}
