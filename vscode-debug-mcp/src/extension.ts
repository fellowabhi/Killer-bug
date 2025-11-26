import * as vscode from 'vscode';
import { startMCPServer, stopMCPServer, setMCPPort, getMCPPort } from './mcp-server';
import { statusBarManager } from './status-bar';
import { ProjectMCPConfigManager } from './project-mcp-config';
import { PortManager } from './port-manager';

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

    // Register configure command for VS Code (project-level)
    const configureCommand = vscode.commands.registerCommand('aiDebugger.configure', async () => {
        console.log('[Extension] Configure VS Code MCP command called');
        
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to configure MCP');
            return;
        }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const configManager = new ProjectMCPConfigManager(projectRoot, 'vscode');
        
        // Show progress while configuring
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Configuring AI Debugger MCP for this project (VS Code)...',
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ increment: 20 });

                    // Get status to see if already configured
                    const status = configManager.getStatus();
                    let portToUse = 3100;

                    if (status.configured && status.port) {
                        portToUse = status.port;
                        console.log(`[Extension] Project already configured on port ${portToUse}`);
                    } else {
                        // Find available port and ask user
                        progress.report({ increment: 40 });
                        const suggestions = await PortManager.getSuggestedPorts(3100, 3);
                        
                        const userChoice = await vscode.window.showQuickPick(
                            suggestions.map(p => ({ label: `Port ${p}`, description: '', port: p })),
                            {
                                placeHolder: 'Select port for MCP server (or use default)',
                                title: 'Choose MCP Server Port'
                            }
                        );

                        if (userChoice) {
                            portToUse = userChoice.port;
                            console.log(`[Extension] User selected port ${portToUse}`);
                        } else {
                            vscode.window.showInformationMessage('MCP configuration cancelled');
                            return;
                        }
                    }

                    progress.report({ increment: 60 });

                    // Configure project with selected port
                    const result = await configManager.configureProject(portToUse);
                    
                    progress.report({ increment: 100 });

                    if (result.success) {
                        statusBarManager.showSuccess('MCP Configured (Project)');
                        
                        // Set the port for this extension instance
                        setMCPPort(portToUse);

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

                        console.log('[Extension] Project configuration successful');
                    } else {
                        statusBarManager.showError('MCP Config Failed');
                        vscode.window.showErrorMessage(result.message, { modal: true });
                        console.log('[Extension] Project configuration failed');
                    }
                } catch (error) {
                    console.error('[Extension] Error in configure command:', error);
                    vscode.window.showErrorMessage(`Error: ${error}`);
                }
            }
        );
    });
    context.subscriptions.push(configureCommand);

    // Register configure command for Cursor IDE (project-level)
    const configureCursorCommand = vscode.commands.registerCommand('aiDebugger.configureCursor', async () => {
        console.log('[Extension] Configure Cursor MCP command called');
        
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('Please open a project folder to configure MCP');
            return;
        }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const configManager = new ProjectMCPConfigManager(projectRoot, 'cursor');
        
        // Show progress while configuring
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Configuring AI Debugger MCP for this project (Cursor)...',
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ increment: 20 });

                    // Get status to see if already configured
                    const status = configManager.getStatus();
                    let portToUse = 3100;

                    if (status.configured && status.port) {
                        portToUse = status.port;
                        console.log(`[Extension] Project already configured on port ${portToUse}`);
                    } else {
                        // Find available port and ask user
                        progress.report({ increment: 40 });
                        const suggestions = await PortManager.getSuggestedPorts(3100, 3);
                        
                        const userChoice = await vscode.window.showQuickPick(
                            suggestions.map(p => ({ label: `Port ${p}`, description: '', port: p })),
                            {
                                placeHolder: 'Select port for MCP server (or use default)',
                                title: 'Choose MCP Server Port'
                            }
                        );

                        if (userChoice) {
                            portToUse = userChoice.port;
                            console.log(`[Extension] User selected port ${portToUse}`);
                        } else {
                            vscode.window.showInformationMessage('MCP configuration cancelled');
                            return;
                        }
                    }

                    progress.report({ increment: 60 });

                    // Configure project with selected port
                    const result = await configManager.configureProject(portToUse);
                    
                    progress.report({ increment: 100 });

                    if (result.success) {
                        statusBarManager.showSuccess('MCP Configured (Project)');
                        
                        // Set the port for this extension instance
                        setMCPPort(portToUse);

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

                        console.log('[Extension] Project configuration successful');
                    } else {
                        statusBarManager.showError('MCP Config Failed');
                        vscode.window.showErrorMessage(result.message, { modal: true });
                        console.log('[Extension] Project configuration failed');
                    }
                } catch (error) {
                    console.error('[Extension] Error in configure Cursor command:', error);
                    vscode.window.showErrorMessage(`Error: ${error}`);
                }
            }
        );
    });
    context.subscriptions.push(configureCursorCommand);

    // Auto-start MCP server on activation
    try {
        // Try to read project config if in workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const projectRoot = workspaceFolders[0].uri.fsPath;
            const configManager = new ProjectMCPConfigManager(projectRoot, 'vscode');
            const status = configManager.getStatus();
            
            if (status.configured && status.port) {
                console.log(`[Extension] Loading project MCP port: ${status.port}`);
                setMCPPort(status.port);
            }
        }

        startMCPServer();
        console.log(`MCP server started automatically on port ${getMCPPort()}`);
        statusBarManager.showSuccess(`MCP Server started (port ${getMCPPort()})`);
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
