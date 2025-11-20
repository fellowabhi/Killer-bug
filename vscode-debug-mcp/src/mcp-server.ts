import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerSessionTools } from './tools/session';

let serverInstance: Server | null = null;

/**
 * Start the MCP server with stdio transport
 */
export function startMCPServer() {
    if (serverInstance) {
        console.log('MCP server already running');
        return;
    }

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

        return { tools };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name, arguments: args } = request.params;

            let result: any;

            // Route to appropriate tool handler
            switch (name) {
                case 'debug_start':
                case 'debug_stop':
                case 'debug_getStatus':
                    const sessionTools = await import('./tools/session');
                    result = await sessionTools.handleSessionTool(name, args || {});
                    break;

                default:
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

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    server.connect(transport);

    serverInstance = server;
    console.log('MCP server started on stdio');
}

/**
 * Stop the MCP server
 */
export function stopMCPServer() {
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
        console.log('MCP server stopped');
    }
}
