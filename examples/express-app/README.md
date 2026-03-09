# Express App Example

A complex Express.js application demonstrating AutoDocs integration for API documentation generation.

## Features

- **User Management**: CRUD operations for users with role-based access
- **Product Catalog**: Product listing with filtering and categorization
- **Order Management**: Order creation, tracking, and status updates
- **Authentication Middleware**: Bearer token validation
- **Logging Middleware**: Request logging with timestamps
- **Error Handling**: Centralized error handling middleware

## Project Structure

```
src/
├── handlers/          # HTTP request handlers
│   ├── userHandlers.ts
│   ├── productHandlers.ts
│   └── orderHandlers.ts
├── middleware/        # Express middleware
│   └── auth.ts       # Authentication and logging middleware
├── routes/           # Route definitions
│   └── api.ts        # API router with all endpoints
├── services/         # Business logic layer
│   └── businessLogic.ts
├── app.ts            # Express app factory
└── index.ts          # Application entry point
```

## Getting Started

```bash
npm install
npm run build
npm run start
```

For development with auto-reload:

```bash
npm run dev
```

## API Endpoints

### Users

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user (requires auth)
- `DELETE /api/users/:id` - Delete user (requires auth)

### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (requires auth)
- `PATCH /api/products/:id` - Update product (requires auth)

### Orders

- `GET /api/orders` - List user's orders (requires auth)
- `GET /api/orders/:id` - Get order by ID (requires auth)
- `POST /api/orders` - Create new order (requires auth)
- `PATCH /api/orders/:id` - Update order (requires auth)
- `DELETE /api/orders/:id` - Cancel order (requires auth)

## AutoDocs Integration

This example uses AutoDocs to automatically generate API documentation from the Express router.

```bash
npm run autodocs
```

This generates an OpenAPI 3.0.0 specification in the `docs/` directory by analyzing:

1. The Express router in `src/routes/api.ts`
2. Handler function JSDoc comments with `@AUTO_DOCS_META` annotations
3. HTTP method signatures and path parameters

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer valid-test-token" http://localhost:3000/api/orders
```
