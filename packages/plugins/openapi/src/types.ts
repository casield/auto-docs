export interface IOpenApiCommentBlockPath {
  summary: string;
  tags: string;
  version: string;
  name: string;
}

export interface IOpenApiCommentBlockResponse {
  statusCode: number;
  description: string;
  type: "application/json" | "text/plain";
  schema: string;
}
