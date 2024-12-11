"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs = __importStar(require("fs"));
var ServerlessDocsPlugin = /** @class */ (function () {
    function ServerlessDocsPlugin(serverless, options, utils) {
        var _this = this;
        this.serverless = serverless;
        this.options = options; // CLI options
        this.utils = utils;
        this.hooks = {
            initialize: function () { return _this.init(); },
            "after:deploy:deploy": function () { return _this.afterDeploy(); },
        };
    }
    ServerlessDocsPlugin.prototype.init = function () {
        this.utils.log("ServerlessDocsPlugin initialized");
    };
    ServerlessDocsPlugin.prototype.getHandlers = function (serverless) {
        var service = serverless.service;
        if (!service.functions) {
            throw new Error("No functions defined in the Serverless service.");
        }
        var handlers = {};
        for (var _i = 0, _a = Object.entries(service.functions); _i < _a.length; _i++) {
            var _b = _a[_i], funcName = _b[0], funcConfig = _b[1];
            var handlerPath = this.getHandlerPath(funcConfig);
            if (!handlerPath) {
                continue;
            }
            var absolutePath = (0, path_1.resolve)((0, path_1.dirname)(serverless.config.servicePath), handlerPath);
            if (!fs.existsSync(absolutePath)) {
                this.utils.log("Handler file not found for function ".concat(funcName, ": ").concat(absolutePath));
                continue;
            }
            try {
                var handlerModule = require(absolutePath);
                // Iterate over all exports to find docs functions
                for (var _c = 0, _d = Object.entries(handlerModule); _c < _d.length; _c++) {
                    var _e = _d[_c], exportName = _e[0], exportedValue = _e[1];
                    if (typeof exportedValue === "function" && exportedValue.name === "docs") {
                        var documentation = exportedValue();
                        if (documentation) {
                            if (!handlers[funcName]) {
                                handlers[funcName] = {
                                    docs: [documentation],
                                    path: handlerPath
                                };
                            }
                            else {
                                handlers[funcName].docs.push(documentation);
                            }
                            this.utils.log("Found documentation in ".concat(funcName, " - Export: ").concat(exportName, " - Docs: ").concat(JSON.stringify(documentation, null, 2)));
                        }
                    }
                }
            }
            catch (error) {
                this.utils.log("Error loading handler file for function ".concat(funcName, ": ").concat(error.message));
            }
        }
        return Object.values(handlers);
    };
    ServerlessDocsPlugin.prototype.getHandlerPath = function (funcConfig) {
        if (!funcConfig.handler) {
            return null;
        }
        var handlerParts = funcConfig.handler.split(".");
        var handlerPath = handlerParts.slice(0, -1).join("."); // Remove the handler function name
        return "".concat(handlerPath, ".ts"); // Adjust file extension as needed (e.g., .ts, .js)
    };
    ServerlessDocsPlugin.prototype.afterDeploy = function () {
        var handlers = this.getHandlers(this.serverless);
        this.utils.log("Discovered handlers: ".concat(JSON.stringify(handlers, null, 2)));
    };
    return ServerlessDocsPlugin;
}());
exports.default = ServerlessDocsPlugin;
