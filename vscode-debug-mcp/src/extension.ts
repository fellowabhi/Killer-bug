import * as vscode from 'vscode';
import { startMCPServer, stopMCPServer } from './mcp-server';
import { statusBarManager } from './status-bar';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug MCP Server extension is activating...');

    // Initialize status bar
    statusBarManager; // Initialize singleton

    // Register command to show output
    const showOutputCommand = vscode.commands.registerCommand('aiDebugger.showOutput', () => {
        // For now, just show a message. We'll add output channel in next step
        vscode.window.showInformationMessage('AI Debugger is active. Check Extension Host output for logs.');
    });
    context.subscriptions.push(showOutputCommand);

    // Auto-start MCP server on activation
    try {
        startMCPServer();
        console.log('MCP server started automatically');
        statusBarManager.showSuccess('MCP Server started');
    } catch (error) {
        console.error('Failed to start MCP server:', error);
        statusBarManager.showError('MCP Server failed to start');
    }

    console.log('AI Debug MCP Server extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate() {
    statusBarManager.dispose();
    stopMCPServer();
    console.log('AI Debug MCP Server extension deactivated');
}
