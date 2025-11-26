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

    // Register configure command for VS Code
    const configureCommand = vscode.commands.registerCommand('aiDebugger.configure', async () => {
        console.log('[Extension] Configure VS Code MCP command called');
        
        // Show progress while configuring
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Configuring AI Debugger MCP for VS Code...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0 });
                
                // Configure VS Code MCP
                const result = await mcpConfigManager.configureVSCode(3100);
                
                progress.report({ increment: 100 });

                if (result.success) {
                    statusBarManager.showSuccess('MCP Configured (VS Code)');
                    
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

                    console.log('[Extension] VS Code configuration successful');
                } else {
                    statusBarManager.showError('MCP Config Failed');
                    vscode.window.showErrorMessage(result.message, { modal: true });
                    console.log('[Extension] VS Code configuration failed');
                }
            }
        );
    });
    context.subscriptions.push(configureCommand);

    // Register configure command for Cursor IDE
    const configureCursorCommand = vscode.commands.registerCommand('aiDebugger.configureCursor', async () => {
        console.log('[Extension] Configure Cursor MCP command called');
        
        // Show progress while configuring
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Configuring AI Debugger MCP for Cursor...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0 });
                
                // Create a temporary manager for Cursor configuration
                const { MCPConfigManager } = await import('./mcp-config');
                const cursorConfigManager = new MCPConfigManager(3100, 'cursor');
                const result = await cursorConfigManager.configureCursor(3100);
                
                progress.report({ increment: 100 });

                if (result.success) {
                    statusBarManager.showSuccess('MCP Configured (Cursor)');
                    
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

                    console.log('[Extension] Cursor configuration successful');
                } else {
                    statusBarManager.showError('MCP Config Failed');
                    vscode.window.showErrorMessage(result.message, { modal: true });
                    console.log('[Extension] Cursor configuration failed');
                }
            }
        );
    });
    context.subscriptions.push(configureCursorCommand);

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
