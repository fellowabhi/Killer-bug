import * as vscode from 'vscode';
import { debugState } from '../debug-state';

/**
 * Get stack trace from current debug session
 */
export async function debugGetStackTrace(): Promise<any> {
    try {
        const session = debugState.getActiveSession();
        if (!session) {
            return {
                success: false,
                error: 'No active debug session. Start debugging first with debug_start.'
            };
        }

        if (!debugState.isPaused) {
            return {
                success: false,
                error: 'Debug session is not paused. Use debug_pause or hit a breakpoint first.'
            };
        }

        // Use cached stack frames if available
        if (debugState.stackFrames && debugState.stackFrames.length > 0) {
            const frames = debugState.stackFrames.map((frame: any, index: number) => ({
                frameId: frame.id,
                index: index,
                name: frame.name,
                source: frame.source?.path || frame.source?.name || 'unknown',
                line: frame.line,
                column: frame.column || 0
            }));

            return {
                success: true,
                sessionId: debugState.sessionId,
                stackFrames: frames,
                frameCount: frames.length
            };
        }

        // Fallback: fetch fresh stack trace via DAP
        try {
            const threadsResponse = await session.customRequest('threads');
            if (!threadsResponse || !threadsResponse.threads || threadsResponse.threads.length === 0) {
                return {
                    success: false,
                    error: 'No threads available in debug session.'
                };
            }

            const threadId = threadsResponse.threads[0].id;
            const stackResponse = await session.customRequest('stackTrace', {
                threadId: threadId,
                startFrame: 0,
                levels: 50
            });

            if (stackResponse && stackResponse.stackFrames) {
                const frames = stackResponse.stackFrames.map((frame: any, index: number) => ({
                    frameId: frame.id,
                    index: index,
                    name: frame.name,
                    source: frame.source?.path || frame.source?.name || 'unknown',
                    line: frame.line,
                    column: frame.column || 0
                }));

                return {
                    success: true,
                    sessionId: debugState.sessionId,
                    stackFrames: frames,
                    frameCount: frames.length
                };
            }

            return {
                success: false,
                error: 'Could not retrieve stack trace.'
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Failed to fetch stack trace: ${error.message}`
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: `Error getting stack trace: ${error.message}`
        };
    }
}

/**
 * Get variables in current scope
 */
export async function debugGetVariables(frameId?: number, scope?: string): Promise<any> {
    try {
        const session = debugState.getActiveSession();
        if (!session) {
            return {
                success: false,
                error: 'No active debug session. Start debugging first with debug_start.'
            };
        }

        if (!debugState.isPaused) {
            return {
                success: false,
                error: 'Debug session is not paused. Use debug_pause or hit a breakpoint first.'
            };
        }

        // Get threads and stack trace
        const threadsResponse = await session.customRequest('threads');
        if (!threadsResponse || !threadsResponse.threads || threadsResponse.threads.length === 0) {
            return {
                success: false,
                error: 'No threads available in debug session.'
            };
        }

        const threadId = threadsResponse.threads[0].id;
        const stackResponse = await session.customRequest('stackTrace', {
            threadId: threadId,
            startFrame: 0,
            levels: 20
        });

        if (!stackResponse || !stackResponse.stackFrames || stackResponse.stackFrames.length === 0) {
            return {
                success: false,
                error: 'No stack frames available.'
            };
        }

        // Use specified frame or top frame
        const targetFrameId = frameId !== undefined ? frameId : stackResponse.stackFrames[0].id;
        
        // Get scopes for the frame
        const scopesResponse = await session.customRequest('scopes', {
            frameId: targetFrameId
        });

        if (!scopesResponse || !scopesResponse.scopes) {
            return {
                success: false,
                error: 'No scopes available for frame.'
            };
        }

        // Filter scopes if specific scope requested
        let targetScopes = scopesResponse.scopes;
        if (scope) {
            targetScopes = scopesResponse.scopes.filter((s: any) => 
                s.name.toLowerCase().includes(scope.toLowerCase())
            );
        }

        // Get variables from each scope
        const allVariables: any[] = [];
        for (const scopeItem of targetScopes) {
            const variablesResponse = await session.customRequest('variables', {
                variablesReference: scopeItem.variablesReference
            });

            if (variablesResponse && variablesResponse.variables) {
                for (const variable of variablesResponse.variables) {
                    allVariables.push({
                        name: variable.name,
                        value: variable.value,
                        type: variable.type || 'unknown',
                        scope: scopeItem.name,
                        variablesReference: variable.variablesReference || 0
                    });
                }
            }
        }

        return {
            success: true,
            sessionId: debugState.sessionId,
            frameId: targetFrameId,
            variables: allVariables,
            variableCount: allVariables.length,
            scopes: targetScopes.map((s: any) => s.name)
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Error getting variables: ${error.message}`
        };
    }
}

/**
 * Evaluate expression in current debug context
 */
export async function debugEvaluate(expression: string, frameId?: number, context?: string): Promise<any> {
    try {
        const session = debugState.getActiveSession();
        if (!session) {
            return {
                success: false,
                error: 'No active debug session. Start debugging first with debug_start.'
            };
        }

        if (!debugState.isPaused) {
            return {
                success: false,
                error: 'Debug session is not paused. Use debug_pause or hit a breakpoint first.'
            };
        }

        // Get frame ID if not provided
        let targetFrameId = frameId;
        if (targetFrameId === undefined) {
            const threadsResponse = await session.customRequest('threads');
            if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                const threadId = threadsResponse.threads[0].id;
                const stackResponse = await session.customRequest('stackTrace', {
                    threadId: threadId,
                    startFrame: 0,
                    levels: 1
                });

                if (stackResponse && stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
                    targetFrameId = stackResponse.stackFrames[0].id;
                }
            }
        }

        if (targetFrameId === undefined) {
            return {
                success: false,
                error: 'Could not determine frame ID for evaluation.'
            };
        }

        // Evaluate the expression
        const evaluateResponse = await session.customRequest('evaluate', {
            expression: expression,
            frameId: targetFrameId,
            context: context || 'watch' // 'watch', 'repl', 'hover', 'clipboard'
        });

        if (evaluateResponse) {
            return {
                success: true,
                sessionId: debugState.sessionId,
                expression: expression,
                result: evaluateResponse.result,
                type: evaluateResponse.type || 'unknown',
                variablesReference: evaluateResponse.variablesReference || 0
            };
        }

        return {
            success: false,
            error: 'Evaluation returned no result.'
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Error evaluating expression: ${error.message}`,
            expression: expression
        };
    }
}

/**
 * Handle inspection tool calls
 */
export async function handleInspectionTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
        case 'debug_getStackTrace':
            return await debugGetStackTrace();

        case 'debug_getVariables':
            return await debugGetVariables(args.frameId, args.scope);

        case 'debug_evaluate':
            if (!args.expression) {
                return {
                    success: false,
                    error: 'Missing required parameter: expression'
                };
            }
            return await debugEvaluate(args.expression, args.frameId, args.context);

        default:
            return {
                success: false,
                error: `Unknown inspection tool: ${toolName}`
            };
    }
}
