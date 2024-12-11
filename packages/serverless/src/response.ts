import { ZodTypeDef } from "zod";

export function response<T>(
  statusCode: number,
  body: T,
  config?: {
    description?: string;
    schema?: ZodTypeDef;
  }
) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}
