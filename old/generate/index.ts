import ServerlessDocsPlugin from './serverless/index';
import { docs, generateDocs, openApiDoc} from './docs';

export {
    docs,
    generateDocs,
    openApiDoc
}

export type {IDocPluginFn, IDocsHandler, Plugins,AvailablePlugins,IDocPlugin,IDocs,IDocsOpenApi} from '@meltwater/serverless-docs'; // Export types for use in other packages