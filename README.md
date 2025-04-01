# Auto-Docs

Auto-Docs is a monorepo project designed to generate documentation and OpenAPI specifications for AWS Lambda functions using the Serverless Framework. It provides tools to analyze function definitions and generate comprehensive documentation.

## Features

- **Core Library**: Analyze Lambda functions and generate documentation using plugins.
- **Serverless Plugin**: Integrates with the Serverless Framework to generate and deploy documentation.
- **OpenAPI Plugin**: Automatically generates OpenAPI specifications from Lambda function definitions.
- **Custom Plugins**: Extend functionality with additional plugins for documentation.

## Packages

This monorepo contains the following packages:

### Core
- **Path**: `packages/core`
- **Description**: Provides the core functionality for analyzing Lambda functions and generating documentation.
- **Key Features**:
  - Function analysis using Babel.
  - Plugin system for extensibility.
  - Generates call trees and documentation definitions.

### Serverless Plugin
- **Path**: `packages/serverless`
- **Description**: A Serverless Framework plugin that integrates with the core library to generate and deploy documentation.
- **Key Features**:
  - Generates OpenAPI specs.
  - Deploys documentation to AWS S3.

### OpenAPI Plugin
- **Path**: `packages/plugins/openapi`
- **Description**: A plugin for generating OpenAPI specifications from Lambda function definitions.
- **Key Features**:
  - Parses function comments to extract OpenAPI metadata.
  - Supports custom schemas and response definitions.

### Other Plugin
- **Path**: `packages/plugins/other-plugin`
- **Description**: Example plugin for extending the core functionality with custom documentation formats.

### Serverless Test
- **Path**: `serverless-test`
- **Description**: Example project demonstrating the integration of the Serverless plugin with Lambda functions.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm (v10 or higher)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-repo/auto-docs.git
cd auto-docs
npm install
```

### Running Tests
Run tests for specific packages:

```bash
npm run test:core
npm run test:serverless
```

### Building the Project
Build the project using Turbo:

```bash
npm run build
```

### Deploying with Serverless
Navigate to the `serverless-test` directory and deploy:

```bash
cd serverless-test
npm run deploy
```

## Documentation

### Generating OpenAPI Specs
The OpenAPI plugin parses function comments to generate OpenAPI specifications. Add `@auto-docs` comments to your Lambda functions to define metadata.

Example:

```ts
/**
 * @auto-docs
 * This is a test function.
 * @name Test Function
 * @version 1.0.0
 * @schema { message: string }
 * @statusCode 200
 */
export const testFunction = async () => {
  return {
    message: "Hello, world!",
  };
};
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and open a pull request.

## License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Serverless Framework](https://www.serverless.com/)
- [OpenAPI Specification](https://swagger.io/specification/)