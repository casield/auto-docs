# AutoDocs Examples

This directory contains two comprehensive example applications demonstrating AutoDocs integration:

1. **Express App** - A traditional Node.js REST API using Express.js
2. **Serverless App** - An AWS Lambda application using the Serverless Framework

Both examples showcase how AutoDocs can automatically generate OpenAPI documentation from your application's code.

## Example Applications

### Express App

A full-featured REST API built with Express.js featuring:

- Multiple route handlers for Users, Products, and Orders
- Middleware for authentication and logging
- Business logic service layer
- AutoDocs integration with `ExpressAdapter`

[See Express App Details](./express-app/README.md)

### Serverless App

A serverless application on AWS Lambda featuring:

- Multiple Lambda functions organized by domain
- Serverless Framework configuration
- Lambda authorizer for API security
- Business logic service layer
- AutoDocs integration with `ServerlessAdapter`

[See Serverless App Details](./serverless-app/README.md)

## Using AutoDocs

Both examples include an `autodocs.config.ts` file that configures AutoDocs for documentation generation.

### Express Example

```bash
cd express-app
npm run autodocs
```

This uses the `ExpressAdapter` to analyze the Express router and generate an OpenAPI spec.

### Serverless Example

```bash
cd serverless-app
npm run autodocs
```

This uses the `ServerlessAdapter` to analyze the `serverless.yml` configuration and Lambda handlers to generate an OpenAPI spec.

## Key Features

### Metadata Annotations

Both examples use `@AUTO_DOCS_META` JSDoc annotations to provide additional metadata:

**Express Example:**

```typescript
/**
 * Retrieve a user by ID
 *
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users/:id"}
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  // ...
};
```

**Serverless Example:**

```typescript
/**
 * Retrieve a user by ID
 *
 * @AUTO_DOCS_META:{"httpMethod":"GET","httpPath":"/users/{id}","statusCodes":[200,404]}
 */
export const getUser: APIGatewayProxyHandler = async (event) => {
  // ...
};
```

### OpenAPI Output

Both examples generate OpenAPI 3.0.0 specifications that document:

- All HTTP endpoints with methods and paths
- Request/response models
- Query parameters and path parameters
- Status codes
- Authentication requirements

Generated documentation is placed in:

- `express-app/docs/openapi.json`
- `serverless-app/docs/openapi.json`

## Architecture

Both examples follow a clean architecture pattern:

```
handlers/          - HTTP request handling and response formatting
├── [domain]Handler.ts - Domain-specific request handlers

middleware/        - Cross-cutting concerns (Express only)
├── auth.ts        - Authentication, authorization, logging

services/          - Business logic layer
├── businessLogic.ts - Data operations and business rules

routes/            - API routing (Express only)
├── api.ts         - Route definitions and middleware wiring

handlers/auth.ts   - Lambda authorizer (Serverless only)
```

## Learning Resources

These examples demonstrate:

1. **How to structure large applications** with separation of concerns
2. **How to document APIs** using AutoDocs metadata
3. **How AutoDocs adapters work** with different frameworks
4. **How to integrate AutoDocs** into your CI/CD pipeline
5. **Best practices for API design** with proper HTTP semantics

## Next Steps

- Modify the handlers to add custom business logic
- Extend the OpenAPI metadata for more detailed documentation
- Integrate with your CI/CD pipeline to auto-generate docs on every commit
- Deploy to production and use the OpenAPI spec with API clients like Swagger UI
- Create client SDKs from the generated OpenAPI specification

## Related Documentation

- [AutoDocs Core Documentation](../packages/core/README.md)
- [Express Adapter Documentation](../packages/adapters/express/README.md)
- [Serverless Adapter Documentation](../packages/adapters/serverless/README.md)
- [CLI Runner Documentation](../packages/cli/README.md)
