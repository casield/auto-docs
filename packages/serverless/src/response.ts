export function response<T, Pl extends DroktTypes.AvailablePlugins>(
  statusCode: number,
  body: T,
  config?: {
    schema?: string;
    description?: string;
  }
) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}
