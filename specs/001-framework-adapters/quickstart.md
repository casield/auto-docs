# Quickstart: Framework Adapters

**Phase**: 1 | **Feature**: 001-framework-adapters | **Date**: 2026-03-08

This guide shows what the developer-facing API looks like after this feature is implemented. It is the target state — **not current behaviour**.

---

## Serverless Framework project

### 1. Install

```bash
npm install --save-dev @auto-docs/core @auto-docs/adapter-serverless @auto-docs/plugin-openapi @auto-docs/cli
```

### 2. Create `autodocs.config.ts`

```ts
import {
  ServerlessAdapter,
  MIDDY_UNWRAP_RULE,
} from "@auto-docs/adapter-serverless";
import { OpenApiDoc } from "@auto-docs/plugin-openapi";

export default {
  name: "My API",
  description: "Auto-generated OpenAPI spec",
  branch: "main",
  adapters: [new ServerlessAdapter({ serverlessYmlPath: "./serverless.yml" })],
  unwrapRules: [MIDDY_UNWRAP_RULE], // optional — peel middy(fn) wrappers
  plugins: [new OpenApiDoc({ outputDir: "./docs", version: "1.0.0" })],
};
```

### 3. Run in CI

```bash
npx autodocs
# → reads autodocs.config.ts
# → parses serverless.yml, discovers handlers
# → applies MIDDY_UNWRAP_RULE where needed
# → builds call trees for each handler
# → OpenApiDoc.onAnalysis() writes docs/openapi.json
```

### 4. Example `serverless.yml` (excerpt)

```yaml
functions:
  getUser:
    handler: src/users.getUser
    events:
      - http:
          method: GET
          path: /users/{id}
  createOrder:
    handler: src/orders.createOrder
    events:
      - http:
          method: POST
          path: /orders
```

### 5. Example handler (Middy-wrapped)

```ts
// src/users.ts
import middy from "@middy/core";

const getUser = async (event) => {
  // business logic
  return {
    statusCode: 200,
    body: JSON.stringify({ id: event.pathParameters.id }),
  };
};

export const getUser = middy(getUser).use(someMiddleware());
//                     ↑ MIDDY_UNWRAP_RULE peels this; call tree starts at inner `getUser`
```

---

## Express project

### 1. Install

```bash
npm install --save-dev @auto-docs/core @auto-docs/adapter-express @auto-docs/plugin-openapi @auto-docs/cli
```

### 2. Create `autodocs.config.ts`

```ts
import { ExpressAdapter } from "@auto-docs/adapter-express";
import { OpenApiDoc } from "@auto-docs/plugin-openapi";

export default {
  name: "My Express API",
  description: "Auto-generated OpenAPI spec",
  branch: "main",
  adapters: [new ExpressAdapter({ routerFilePath: "./src/routes/index.ts" })],
  plugins: [new OpenApiDoc({ outputDir: "./docs", version: "2.0.0" })],
};
```

### 3. Run in CI

```bash
npx autodocs
# → statically analyses src/routes/index.ts
# → discovers GET /users, POST /users, DELETE /users/:id
# → builds call trees for each route handler
# → OpenApiDoc.onAnalysis() writes docs/openapi.json
```

---

## Custom adapter (third-party)

```ts
import { FrameworkAdapter, EntryPoint } from "@auto-docs/core";

class FastifyAdapter extends FrameworkAdapter {
  constructor(private readonly routesDir: string) {
    super();
  }

  resolveEntryPoints(): EntryPoint[] {
    // read files in routesDir, parse Fastify schema patterns
    return [
      {
        functionName: "getUser",
        filePath: "/abs/path/userRoutes.ts",
        metadata: { httpMethod: "get", httpPath: "/users/:id" },
      },
      {
        functionName: "createUser",
        filePath: "/abs/path/userRoutes.ts",
        metadata: { httpMethod: "post", httpPath: "/users" },
      },
    ];
  }
}

// autodocs.config.ts
export default {
  adapters: [new FastifyAdapter("./src/routes")],
  plugins: [new OpenApiDoc({ outputDir: "./docs" })],
};
```

---

## What `onAnalysis` receives (plugin-side)

```ts
import { AutoDocsPlugin, NodeReturn } from "@auto-docs/core";

class MyPlugin extends AutoDocsPlugin<"myPlugin"> {
  constructor() {
    super("myPlugin");
  }

  onAnalysis(trees: NodeReturn[]): void {
    for (const root of trees) {
      // root.description may contain serialised metadata:
      // "AUTO_DOCS_META:{\"httpMethod\":\"get\",\"httpPath\":\"/users/:id\"}"
      const meta = root.description?.includes("AUTO_DOCS_META:")
        ? JSON.parse(root.description.split("AUTO_DOCS_META:")[1])
        : {};

      console.log(root.value, meta.httpMethod, meta.httpPath);
      // walk root.children for the full call tree
    }
  }
}
```

---

## Migration from v1 `AutoDocsBuilder.docs()`

```ts
// BEFORE (v1)
const builder = new AutoDocsBuilder({
  plugins: [OpenApiDoc], // class reference
  pluginConfig: { openApi: { outputDir: "docs", version: "1.0.0" } },
  // ...
});
await builder.docs("openApi", {
  type: "method",
  path: { path: "/users", method: "get" },
  summary: "...",
});
await builder.run();

// AFTER (v2 — no more manual .docs() calls)
const builder = new AutoDocsBuilder({
  plugins: [new OpenApiDoc({ outputDir: "docs", version: "1.0.0" })], // instance
  adapters: [new ServerlessAdapter({ serverlessYmlPath: "./serverless.yml" })],
  // ...
});
await builder.analyze(); // discovers handlers, builds trees, calls plugin.onAnalysis()
```

Manual `.docs()` calls still work for backward compatibility — their data takes precedence over auto-derived data within the plugin.
