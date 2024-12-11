import "./global-types";

export const openApiDoc: DroktTypes.IDocPluginFn<"openApi"> = () => {
  return {
    type: "openApi",
    onBuild: (handlers) => {},
  };
};
