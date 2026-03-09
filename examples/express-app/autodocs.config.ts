import path from 'path';
import { AutoDocsBuilder } from '@auto-docs/core';
import { OpenApiDoc } from '@auto-docs/openapi-plugin';
import { ExpressAdapter } from '@auto-docs/adapter-express';

export default {
    name: 'Express App API',
    branch: 'main',
    version: '1.0.0',
    plugins: [
        new OpenApiDoc({
            outputDir: path.join(process.cwd(), 'docs'),
            version: '3.0.0',
        }),
    ],
    adapters: [
        new ExpressAdapter({
            routerPath: path.join(process.cwd(), 'src/routes/api.ts'),
        }),
    ],
    unwrapRules: [],
};
