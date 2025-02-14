import "@drokt/core";

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
