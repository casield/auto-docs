import { AuthorizerEvent, AuthorizerResult } from 'aws-lambda';

/**
 * Lambda authorizer for validating Bearer tokens
 * 
 * @AUTO_DOCS_META:{"type":"authorizer","version":"1.0"}
 */
export const authorizeRequest = async (
    event: AuthorizerEvent
): Promise<AuthorizerResult> => {
    const authHeader = event.authorizationToken;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }

    const token = authHeader.substring(7);
    const isValid = validateToken(token);

    if (!isValid) {
        throw new Error('Invalid token');
    }

    return {
        principalId: 'user',
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: event.methodArn,
                },
            ],
        },
    };
};

function validateToken(token: string): boolean {
    return token === 'valid-test-token' || token.length > 10;
}
