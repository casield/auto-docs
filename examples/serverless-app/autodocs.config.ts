import { AutoDocsBuilder } from '@auto-docs/core';
import { OpenApiDoc } from '@auto-docs/openapi-plugin';
import { ServerlessAdapter } from '@auto-docs/adapter-serverless';

export default {
    name: 'Serverless App API',
    branch: 'main',
    version: '1.0.0',
    plugins: [
        new OpenApiDoc({
            outputDir: './docs',
            version: '3.0.0',
        }),
    ],
    adapters: [
        new ServerlessAdapter({
            configPath: './serverless.yml',
        }),
    ],
    unwrapRules: [],
};
