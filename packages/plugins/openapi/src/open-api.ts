declare global {
  export namespace DroktTypes {
    /**
     * A simplified TypeScript definition for the OpenAPI v3 Specification.
     */
    export interface OpenAPISpec {
      openapi: string; // e.g., "3.0.0"
      info: InfoObject;
      servers?: ServerObject[];
      paths: {
        [path: string]: PathItemObject;
      };
      components?: ComponentsObject;
      security?: SecurityRequirementObject[];
      tags?: TagObject[];
      externalDocs?: ExternalDocumentationObject;
    }

    export interface InfoObject {
      title: string;
      description?: string;
      termsOfService?: string;
      contact?: ContactObject;
      license?: LicenseObject;
      version: string;
    }

    export interface ContactObject {
      name?: string;
      url?: string;
      email?: string;
    }

    export interface LicenseObject {
      name: string;
      url?: string;
    }

    export interface ServerObject {
      url: string;
      description?: string;
      variables?: { [variable: string]: ServerVariableObject };
    }

    export interface ServerVariableObject {
      enum?: string[];
      default: string;
      description?: string;
    }

    export interface PathItemObject {
      $ref?: string;
      summary?: string;
      description?: string;
      get?: OperationObject;
      put?: OperationObject;
      post?: OperationObject;
      delete?: OperationObject;
      options?: OperationObject;
      head?: OperationObject;
      patch?: OperationObject;
      trace?: OperationObject;
      servers?: ServerObject[];
      parameters?: (ParameterObject | ReferenceObject)[];
    }

    export interface OperationObject {
      tags?: string[];
      summary?: string;
      description?: string;
      externalDocs?: ExternalDocumentationObject;
      operationId?: string;
      parameters?: (ParameterObject | ReferenceObject)[];
      requestBody?: RequestBodyObject | ReferenceObject;
      responses: ResponsesObject;
      callbacks?: { [callback: string]: CallbackObject | ReferenceObject };
      deprecated?: boolean;
      security?: SecurityRequirementObject[];
      servers?: ServerObject[];
    }

    export interface ExternalDocumentationObject {
      description?: string;
      url: string;
    }

    export interface ParameterObject {
      name: string;
      in: "query" | "header" | "path" | "cookie";
      description?: string;
      required?: boolean;
      deprecated?: boolean;
      allowEmptyValue?: boolean;
      style?: string;
      explode?: boolean;
      allowReserved?: boolean;
      schema?: SchemaObject | ReferenceObject;
      example?: any;
      examples?: { [example: string]: ExampleObject | ReferenceObject };
      content?: { [media: string]: MediaTypeObject };
    }

    export interface RequestBodyObject {
      description?: string;
      content: { [media: string]: MediaTypeObject };
      required?: boolean;
    }

    export interface MediaTypeObject {
      schema?: SchemaObject | ReferenceObject;
      example?: any;
      examples?: { [example: string]: ExampleObject | ReferenceObject };
      encoding?: { [encoding: string]: EncodingObject };
    }

    export interface EncodingObject {
      contentType?: string;
      headers?: { [header: string]: HeaderObject | ReferenceObject };
      style?: string;
      explode?: boolean;
      allowReserved?: boolean;
    }

    export interface ResponsesObject {
      [statusCode: string]: ResponseObject | ReferenceObject;
    }

    export interface ResponseObject {
      description: string;
      headers?: { [header: string]: HeaderObject | ReferenceObject };
      content?: { [media: string]: MediaTypeObject };
      links?: { [link: string]: LinkObject | ReferenceObject };
    }

    export interface CallbackObject {
      [expression: string]: PathItemObject;
    }

    export interface ExampleObject {
      summary?: string;
      description?: string;
      value?: any;
      externalValue?: string;
    }

    export interface LinkObject {
      operationRef?: string;
      operationId?: string;
      parameters?: { [parameter: string]: any };
      requestBody?: any;
      description?: string;
      server?: ServerObject;
    }

    export interface HeaderObject extends ParameterObject {}

    export interface ComponentsObject {
      schemas?: { [schema: string]: SchemaObject | ReferenceObject };
      responses?: { [response: string]: ResponseObject | ReferenceObject };
      parameters?: { [parameter: string]: ParameterObject | ReferenceObject };
      examples?: { [example: string]: ExampleObject | ReferenceObject };
      requestBodies?: {
        [request: string]: RequestBodyObject | ReferenceObject;
      };
      headers?: { [header: string]: HeaderObject | ReferenceObject };
      securitySchemes?: {
        [scheme: string]: SecuritySchemeObject | ReferenceObject;
      };
      links?: { [link: string]: LinkObject | ReferenceObject };
      callbacks?: { [callback: string]: CallbackObject | ReferenceObject };
    }

    export interface ReferenceObject {
      $ref: string;
    }

    export interface SchemaObject {
      title?: string;
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: boolean | number;
      minimum?: number;
      exclusiveMinimum?: boolean | number;
      maxLength?: number;
      minLength?: number;
      pattern?: string;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      maxProperties?: number;
      minProperties?: number;
      required?: string[];
      enum?: any[];
      type?: string;
      allOf?: (SchemaObject | ReferenceObject)[];
      oneOf?: (SchemaObject | ReferenceObject)[];
      anyOf?: (SchemaObject | ReferenceObject)[];
      not?: SchemaObject | ReferenceObject;
      items?: SchemaObject | ReferenceObject;
      properties?: { [propertyName: string]: SchemaObject | ReferenceObject };
      additionalProperties?: boolean | SchemaObject | ReferenceObject;
      description?: string;
      format?: string;
      default?: any;
      nullable?: boolean;
      discriminator?: DiscriminatorObject;
      readOnly?: boolean;
      writeOnly?: boolean;
      xml?: XMLObject;
      externalDocs?: ExternalDocumentationObject;
      example?: any;
      deprecated?: boolean;
    }

    export interface DiscriminatorObject {
      propertyName: string;
      mapping?: { [key: string]: string };
    }

    export interface XMLObject {
      name?: string;
      namespace?: string;
      prefix?: string;
      attribute?: boolean;
      wrapped?: boolean;
    }

    export interface SecurityRequirementObject {
      [name: string]: string[];
    }

    export interface SecuritySchemeObject {
      type: "apiKey" | "http" | "oauth2" | "openIdConnect";
      description?: string;
      name?: string;
      in?: "query" | "header" | "cookie";
      scheme?: string;
      bearerFormat?: string;
      flows?: OAuthFlowsObject;
      openIdConnectUrl?: string;
    }

    export interface OAuthFlowsObject {
      implicit?: OAuthFlowObject;
      password?: OAuthFlowObject;
      clientCredentials?: OAuthFlowObject;
      authorizationCode?: OAuthFlowObject;
    }

    export interface OAuthFlowObject {
      authorizationUrl: string;
      tokenUrl: string;
      refreshUrl?: string;
      scopes: { [scope: string]: string };
    }

    export interface TagObject {
      name: string;
      description?: string;
      externalDocs?: ExternalDocumentationObject;
    }
  }
}

export {};
