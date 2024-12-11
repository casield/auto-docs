import "@drokt/core/src/types";

declare global {
  export namespace DroktTypes {
    export interface IDocsOpenApi extends IDocs {
      other: string;
    }
    export interface Plugins {
      openApi: IDocsOpenApi;
    }
  }
}
