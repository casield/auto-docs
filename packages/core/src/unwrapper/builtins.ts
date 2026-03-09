import { UnwrapRule } from "./HandlerUnwrapper";

/**
 * Built-in unwrap rule for Middy middleware.
 *
 * Handles the pattern: `export const handler = middy(myBusinessLogic)`
 * → unwraps to `myBusinessLogic`.
 */
export const MIDDY_UNWRAP_RULE: UnwrapRule = {
    callee: "middy",
    argIndex: 0,
};
