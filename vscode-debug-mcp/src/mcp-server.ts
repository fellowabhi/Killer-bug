/*
 * Killer Bug AI Debugger
 * Copyright (C) 2025 Abhishek (fellowabhi)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import express from 'express';
import type { Express, Request, Response } from 'express';
import { handleSessionTool } from './tools/session';
import { handleBreakpointTool } from './tools/breakpoints';
import { handleExecutionTool } from './tools/execution';
import { handleInspectionTool } from './tools/inspection';
import { PortManager } from './port-manager';

let httpServer: any = null;
let currentPort: number = 3100;

/**
 * Set the port for MCP server (called by extension)
 */
export function setMCPPort(port: number): void {
    currentPort = port;
    console.log(`[MCP Server] Port set to ${port}`);
}

/**
 * Get the current port the MCP server is running on
 */
export function getMCPPort(): number {
    return currentPort;
}

/**
 * Start the MCP server with HTTP JSON-RPC transport
 */
export async function startMCPServer() {
    if (httpServer) {
        console.log('MCP server already running on port', currentPort);
        return;
    }

    // Try to find an available port if the current one is in use
    try {
        const portInUse = await PortManager.isPortInUse(currentPort);
        if (portInUse) {
            console.log(`[MCP Server] Port ${currentPort} is in use, finding available port...`);
            const availablePort = await PortManager.findAvailablePort(currentPort);
            console.log(`[MCP Server] Using available port: ${availablePort}`);
            currentPort = availablePort;
        }
    } catch (error) {
        console.warn('[MCP Server] Could not check port availability:', error);
    }

    // Create Express app
    const app: Express = express();
    
    app.use(express.json());
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    // Main MCP endpoint - handles all JSON-RPC requests
    app.post('/mcp', async (req: Request, res: Response) => {
        try {
            const request = req.body;
            
            // Handle different MCP methods
            if (request.method === 'initialize') {
                res.json({
                    jsonrpc: '2.0',
                    id: request.id,
                    result: {
                        protocolVersion: '2024-11-05',
                        capabilities: {
                            tools: {}
                        },
                        serverInfo: {
                            name: 'killer-bug-ai-debugger',
                            version: '0.1.0'
                        }
                    }
                });
            } else if (request.method === 'notifications/initialized') {
                // Acknowledge the initialized notification
                res.status(200).json({
                    jsonrpc: '2.0',
                    result: {}
                });
            } else if (request.method === 'tools/list') {
                const tools = getToolsList();
                res.json({
                    jsonrpc: '2.0',
                    id: request.id,
                    result: { tools }
                });
            } else if (request.method === 'tools/call') {
                const result = await handleToolCall(request.params);
                res.json({
                    jsonrpc: '2.0',
                    id: request.id,
                    result
                });
            } else {
                res.status(400).json({
                    jsonrpc: '2.0',
                    id: request.id,
                    error: {
                        code: -32601,
                        message: `Method not found: ${request.method}`
                    }
                });
            }
        } catch (error: any) {
            res.status(500).json({
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                    code: -32603,
                    message: error.message
                }
            });
        }
    });

    // Health check endpoint
    app.get('/health', (req: Request, res: Response) => {
        res.json({ 
            status: 'ok', 
            server: 'killer-bug-ai-debugger',
            version: '0.2.0',
            tools: 17,
            endpoint: '/mcp'
        });
    });

    // Start HTTP server
    httpServer = app.listen(currentPort, () => {
        console.log(`Killer Bug AI Debugger listening on http://localhost:${currentPort}`);
        console.log(`MCP endpoint: POST http://localhost:${currentPort}/mcp`);
        console.log(`Health check: GET http://localhost:${currentPort}/health`);
    });
}

/**
 * Get list of all available tools
 */
function getToolsList() {
    return [
        {
            name: 'debug_start',
            description: 'Start a debug session for a file. WORKFLOW: Call debug_listConfigs first to check for existing launch.json configurations. Prefer debug_startWithConfig when available. Use this only when no suitable configuration exists.',
            inputSchema: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Absolute path to the file to debug' },
                    type: { type: 'string', description: 'Debug type (e.g., "python", "node"). Auto-detected if not specified.' },
                    stopOnEntry: { type: 'boolean', description: 'Stop at the first line of the program' }
                },
                required: ['file']
            }
        },
        {
            name: 'debug_stop',
            description: 'Stop the current debug session. CLEANUP: Remove all breakpoints with debug_listBreakpoints before stopping to ensure clean state.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_getStatus',
            description: 'Get current debug session status (whether paused/running, current line, function, etc.).',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_listConfigs',
            description: 'List all debug configurations from launch.json in the workspace. WORKFLOW: Use this to discover existing debug configurations before using debug_start or debug_attach. Prefer existing configs when available.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_startWithConfig',
            description: 'PREFERRED METHOD: Start debugging using an existing named configuration from launch.json. This is the recommended approach over debug_start or debug_attach. Always call debug_listConfigs first to see available configurations.',
            inputSchema: {
                type: 'object',
                properties: {
                    configName: { type: 'string', description: 'Name of the debug configuration from launch.json' },
                    folder: { type: 'string', description: 'Workspace folder name (optional, uses first if not specified)' }
                },
                required: ['configName']
            }
        },
        {
            name: 'debug_attach',
            description: 'Attach to a running process for remote debugging (e.g., FastAPI with debugpy listening on a port). FALLBACK ONLY: Use this only when no suitable launch.json configuration exists. Requires the target application to be already running with debugger listening.',
            inputSchema: {
                type: 'object',
                properties: {
                    type: { type: 'string', description: 'Debugger type: debugpy, python, node, pwa-node (default: debugpy)' },
                    host: { type: 'string', description: 'Host to connect to (default: localhost)' },
                    port: { type: 'number', description: 'Port number the debugger is listening on' },
                    pathMappings: { type: 'object', description: 'Path mappings for remote/container debugging (optional)' },
                    name: { type: 'string', description: 'Custom name for the debug session (optional)' }
                },
                required: ['port']
            }
        },
        {
            name: 'debug_setBreakpoint',
            description: 'Set a breakpoint at a specific line in a file. IMPORTANT CLEANUP REQUIRED: You MUST track all breakpoints you create and remove them before ending the debug session using debug_removeBreakpoint. Failure to clean up will cause unexpected breaks in future sessions. NOTE: You may keep breakpoints if you plan to reuse them across multiple debug sessions for the same investigation.',
            inputSchema: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Absolute path to the file' },
                    line: { type: 'number', description: 'Line number (1-based)' },
                    condition: { type: 'string', description: 'Optional condition expression' }
                },
                required: ['file', 'line']
            }
        },
        {
            name: 'debug_removeBreakpoint',
            description: 'Remove a breakpoint from a specific line. CRITICAL: Always remove breakpoints you set during debugging before ending the final session. This is mandatory for clean state management. Use debug_listBreakpoints to verify all breakpoints that you added are removed before ending session. NOTE: You may temporarily keep breakpoints between related debug sessions if continuing the same investigation.',
            inputSchema: {
                type: 'object',
                properties: {
                    file: { type: 'string', description: 'Absolute path to the file' },
                    line: { type: 'number', description: 'Line number (1-based)' }
                },
                required: ['file', 'line']
            }
        },
        {
            name: 'debug_listBreakpoints',
            description: 'List all breakpoints. Use this to track which breakpoints are active and verify cleanup.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_continue',
            description: 'Continue execution until next breakpoint. PREREQUISITE: Debugger must be paused (at breakpoint or after debug_pause). Will fail if debugger is running. IMPORTANT PLANNING: Before continuing, ensure you have breakpoints strategically placed if you want to catch the intended code path. Else you might miss your debugging target and has to retrigger it.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_stepOver',
            description: 'Step over the current line (execute without entering functions). PREREQUISITE: Debugger must be paused.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_stepInto',
            description: 'Step into function call on current line. PREREQUISITE: Debugger must be paused and current line must contain a function call. IMPORTANT: Only step into if you want to debug that specific function. Stepping into system/library functions will lose you in framework code. Instead: set breakpoints at your target locations and use debug_continue, or use debug_stepOver to skip uninteresting functions.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_stepOut',
            description: 'Step out of current function (resume until function returns). PREREQUISITE: Debugger must be paused inside a function. Use this to escape deep call stacks. The execution will continue until the current function returns, then pause at the return location.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_pause',
            description: 'Pause execution at current location. Use when debugger is running and you need to stop it to inspect state. Does not require breakpoints. WORKFLOW: Use this only when: 1) Code is actively running and you need to inspect mid-execution, 2) You want to interrupt a long-running operation, 3) You\'re debugging infinite loops. For targeted debugging, prefer setting breakpoints instead of relying on pause.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_getStackTrace',
            description: 'Get the current call stack with function names, file paths, and line numbers. PREREQUISITE: Debugger must be paused. Returns stack frames showing the execution path. WORKFLOW: Always call this BEFORE debug_getVariables to identify which frame you want to inspect. Returns frameId values needed for other inspection tools.',
            inputSchema: { type: 'object', properties: {} }
        },
        {
            name: 'debug_getVariables',
            description: 'Get variables in the current scope or specified frame. PREREQUISITE: Debugger must be paused. WORKFLOW: Call debug_getStackTrace first to get available frameIds. Specify a frameId to inspect different stack levels. Default scope shows local variables; use scope filter for "global" or "static" if available.',
            inputSchema: {
                type: 'object',
                properties: {
                    frameId: { type: 'number', description: 'Stack frame ID (optional, defaults to top frame)' },
                    scope: { type: 'string', description: 'Scope filter: "local", "global", etc. (optional)' }
                }
            }
        },
        {
            name: 'debug_evaluate',
            description: 'Evaluate an expression in the current debug context (e.g., variable values, function results). PREREQUISITE: Debugger must be paused. WORKFLOW: Use this cleverly to discover extra context. CRITICAL: Only evaluate SAFE READ operations. If your expression might have side effects (call functions that modify state, access external APIs, etc.), you MUST ask the user for permission BEFORE evaluating.',
            inputSchema: {
                type: 'object',
                properties: {
                    expression: { type: 'string', description: 'Expression to evaluate' },
                    frameId: { type: 'number', description: 'Stack frame ID (optional, defaults to top frame)' },
                    context: { type: 'string', description: 'Evaluation context: "watch", "repl", "hover" (optional)' }
                },
                required: ['expression']
            }
        }
    ];
}

/**
 * Handle tool call requests
 */
async function handleToolCall(params: any) {
    const { name, arguments: args } = params;

    try {
        let result: any;

        // Route to appropriate tool handler
        if (name.startsWith('debug_') && ['debug_start', 'debug_stop', 'debug_getStatus', 'debug_listConfigs', 'debug_startWithConfig', 'debug_attach'].includes(name)) {
            result = await handleSessionTool(name, args || {});
        } else if (name.startsWith('debug_') && ['debug_setBreakpoint', 'debug_removeBreakpoint', 'debug_listBreakpoints'].includes(name)) {
            result = await handleBreakpointTool(name, args || {});
        } else if (name.startsWith('debug_') && ['debug_continue', 'debug_stepOver', 'debug_stepInto', 'debug_stepOut', 'debug_pause'].includes(name)) {
            result = await handleExecutionTool(name, args || {});
        } else if (name.startsWith('debug_') && ['debug_getStackTrace', 'debug_getVariables', 'debug_evaluate'].includes(name)) {
            result = await handleInspectionTool(name, args || {});
        } else {
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`
                }
            ],
            isError: true
        };
    }
}

/**
 * Stop the MCP server
 */
export function stopMCPServer() {
    if (httpServer) {
        httpServer.close();
        httpServer = null;
        console.log('MCP server stopped');
    }
}
