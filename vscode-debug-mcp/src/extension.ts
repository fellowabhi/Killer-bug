import * as vscode from 'vscode';
import { startMCPServer, stopMCPServer } from './mcp-server';
import { statusBarManager } from './status-bar';
import { mcpConfigManager } from './mcp-config';

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

    // Register configure command
    const configureCommand = vscode.commands.registerCommand('aiDebugger.configure', async () => {
        console.log('[Extension] Configure command called');
        
        // Show progress while configuring
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Configuring AI Debugger MCP...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0 });
                
                // Configure VS Code MCP
                const result = await mcpConfigManager.configureVSCode(3100);
                
                progress.report({ increment: 100 });

                if (result.success) {
                    statusBarManager.showSuccess('MCP Configured');
                    
                    // Show result with action buttons
                    vscode.window.showInformationMessage(
                        result.message,
                        { modal: false },
                        {
                            title: 'Open Config File',
                            action: async () => {
                                try {
                                    const configUri = vscode.Uri.file(result.configPath);
                                    await vscode.commands.executeCommand('vscode.open', configUri);
                                } catch (error) {
                                    vscode.window.showErrorMessage(`Failed to open config file: ${error}`);
                                }
                            }
                        }
                    );

                    console.log('[Extension] Configuration successful');
                } else {
                    statusBarManager.showError('MCP Config Failed');
                    vscode.window.showErrorMessage(result.message, { modal: true });
                    console.log('[Extension] Configuration failed');
                }
            }
        );
    });
    context.subscriptions.push(configureCommand);

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
