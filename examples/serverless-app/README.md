# Serverless App Example

A complex AWS Lambda application using the Serverless Framework, demonstrating AutoDocs integration for API documentation generation.

## Features

- **User Management**: Lambda functions for CRUD operations on users
- **Product Catalog**: Product listing with filtering and inventory tracking
- **Order Management**: Order creation, tracking, and status updates
- **Lambda Authorizer**: Custom authorizer for Bearer token validation
- **Multiple Lambda Functions**: Separated concerns with dedicated handlers per domain
- **HTTP Events**: REST API endpoints defined in `serverless.yml`

## Project Structure

```
src/
├── handlers/          # Lambda function handlers
│   ├── auth.ts       # Authorization function
│   ├── users.ts      # User management functions
│   ├── products.ts   # Product catalog functions
│   └── orders.ts     # Order management functions
├── services/         # Business logic layer
│   └── businessLogic.ts
└── [compiled handlers in dist/ after build]
```

## Getting Started

```bash
npm install
npm run build
```

For local development with the Serverless offline plugin:

```bash
npm run offline
```

For deployment to AWS:

```bash
npm run deploy
```

## Lambda Functions

### User Management

- **getUser** - `GET /users/{id}` - Retrieve user by ID
- **listUsers** - `GET /users` - List all users with filtering
- **createUser** - `POST /users` - Create new user
- **updateUser** - `PATCH /users/{id}` - Update user (requires auth)
- **deleteUser** - `DELETE /users/{id}` - Delete user (requires auth)

### Product Management

- **listProducts** - `GET /products` - List products with pagination
- **getProduct** - `GET /products/{id}` - Get product by ID
- **createProduct** - `POST /products` - Create new product (requires auth)

### Order Management (All protected with authorizer)

- **getOrder** - `GET /orders/{id}` - Get order by ID
- **listOrders** - `GET /orders` - List user's orders
- **createOrder** - `POST /orders` - Create new order
- **updateOrder** - `PATCH /orders/{id}` - Update order status
- **cancelOrder** - `DELETE /orders/{id}` - Cancel order

### Authorization

- **authorizeRequest** - Custom Lambda authorizer validating Bearer tokens

## AutoDocs Integration

This example uses AutoDocs to automatically generate API documentation from the `serverless.yml` configuration and Lambda handler functions.

```bash
npm run autodocs
```

This generates an OpenAPI 3.0.0 specification in the `docs/` directory by analyzing:

1. The `serverless.yml` configuration
2. Handler function JSDoc comments with `@AUTO_DOCS_META` annotations
3. HTTP event definitions and path parameters
4. Authorization requirements

## Authentication

Protected endpoints require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer valid-test-token" \
  https://your-api-gateway-url/dev/orders
```

## Deployment Environment

- **Runtime**: Node.js 18.x
- **Region**: us-east-1 (configurable in `serverless.yml`)
- **Framework**: Serverless Framework v3
- **Plugins**: serverless-offline (for local development)

## Configuration

Edit `serverless.yml` to:

- Change AWS region
- Modify function memory, timeout, or environment variables
- Add additional HTTP events or event sources
- Configure VPC access or layers
