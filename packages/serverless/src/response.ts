export function response<T>(
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
