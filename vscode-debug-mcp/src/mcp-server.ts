import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import type { Express } from 'express';

let serverInstance: Server | null = null;
let httpServer: any = null;
const PORT = 3100;

/**
 * Start the MCP server with HTTP/SSE transport
 */
export function startMCPServer() {
    if (serverInstance) {
        console.log('MCP server already running on port', PORT);
        return;
    }

    // Create Express app
    const app: Express = express();
    
    app.use(express.json());

    // Create MCP server
    const server = new Server(
        {
            name: 'vscode-debug-mcp',
            version: '0.1.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    // Register tool list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools = [];
        
        // Session tools
        tools.push({
            name: 'debug_start',
            description: 'Start a debug session for a file',
            inputSchema: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'Absolute path to the file to debug',
                    },
                    type: {
                        type: 'string',
                        description: 'Debug type (e.g., "python", "node"). Auto-detected if not specified.',
                    },
                    stopOnEntry: {
                        type: 'boolean',
                        description: 'Stop at the first line of the program',
                        default: false,
                    },
                },
                required: ['file'],
            },
        });

        tools.push({
            name: 'debug_stop',
            description: 'Stop the current debug session',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        tools.push({
            name: 'debug_getStatus',
            description: 'Get current debug session status',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        // Breakpoint tools
        tools.push({
            name: 'debug_setBreakpoint',
            description: 'Set a breakpoint at a specific line in a file',
            inputSchema: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'Absolute path to the file',
                    },
                    line: {
                        type: 'number',
                        description: 'Line number (1-based)',
                    },
                    condition: {
                        type: 'string',
                        description: 'Optional condition expression (e.g., "x > 10")',
                    },
                },
                required: ['file', 'line'],
            },
        });

        tools.push({
            name: 'debug_removeBreakpoint',
            description: 'Remove a breakpoint from a specific line',
            inputSchema: {
                type: 'object',
                properties: {
                    file: {
                        type: 'string',
                        description: 'Absolute path to the file',
                    },
                    line: {
                        type: 'number',
                        description: 'Line number (1-based)',
                    },
                },
                required: ['file', 'line'],
            },
        });

        tools.push({
            name: 'debug_listBreakpoints',
            description: 'List all breakpoints',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        // Execution control tools
        tools.push({
            name: 'debug_continue',
            description: 'Continue execution until next breakpoint',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        tools.push({
            name: 'debug_stepOver',
            description: 'Step over the current line (execute and move to next line)',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        tools.push({
            name: 'debug_stepInto',
            description: 'Step into function call on current line',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        tools.push({
            name: 'debug_stepOut',
            description: 'Step out of current function',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        tools.push({
            name: 'debug_pause',
            description: 'Pause execution',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        });

        return { tools };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name, arguments: args } = request.params;

            let result: any;

            // Route to appropriate tool handler
            if (name.startsWith('debug_') && ['debug_start', 'debug_stop', 'debug_getStatus'].includes(name)) {
                const sessionTools = await import('./tools/session');
                result = await sessionTools.handleSessionTool(name, args || {});
            } else if (name.startsWith('debug_') && ['debug_setBreakpoint', 'debug_removeBreakpoint', 'debug_listBreakpoints'].includes(name)) {
                const breakpointTools = await import('./tools/breakpoints');
                result = await breakpointTools.handleBreakpointTool(name, args || {});
            } else if (name.startsWith('debug_') && ['debug_continue', 'debug_stepOver', 'debug_stepInto', 'debug_stepOut', 'debug_pause'].includes(name)) {
                const executionTools = await import('./tools/execution');
                result = await executionTools.handleExecutionTool(name, args || {});
            } else {
                throw new Error(`Unknown tool: ${name}`);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    });

    // Set up SSE endpoint
    app.get('/sse', async (req, res) => {
        console.log('SSE client connected');
        
        const transport = new SSEServerTransport('/message', res);
        await server.connect(transport);
        
        res.on('close', () => {
            console.log('SSE client disconnected');
        });
    });

    // Set up message endpoint
    app.post('/message', async (req, res) => {
        // SSE transport handles this
        res.status(200).end();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            server: 'vscode-debug-mcp',
            version: '0.1.0',
            tools: 11
        });
    });

    // Start HTTP server
    httpServer = app.listen(PORT, () => {
        console.log(`MCP server listening on http://localhost:${PORT}`);
        console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });

    serverInstance = server;
}

/**
 * Stop the MCP server
 */
export function stopMCPServer() {
    if (httpServer) {
        httpServer.close();
        httpServer = null;
        console.log('HTTP server stopped');
    }
    
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
        console.log('MCP server stopped');
    }
}
