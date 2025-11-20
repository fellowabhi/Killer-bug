import * as vscode from 'vscode';
import { startMCPServer, stopMCPServer } from './mcp-server';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug MCP Server extension is activating...');

    // Auto-start MCP server on activation
    try {
        startMCPServer();
        console.log('MCP server started automatically');
    } catch (error) {
        console.error('Failed to start MCP server:', error);
    }

    console.log('AI Debug MCP Server extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate() {
    stopMCPServer();
    console.log('AI Debug MCP Server extension deactivated');
}
