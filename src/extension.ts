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

import * as vscode from 'vscode';
import { startMCPServer, stopMCPServer, setMCPPort, getMCPPort, isServerRunning } from './mcp-server';
import { statusBarManager } from './status-bar';
import { ProjectMCPConfigManager } from './project-mcp-config';
import { PortRegistry } from './port-registry';

/**
 * Extension activation entry point
 * 
 * NOTE: Extension is now "lazy" - it activates but does NOT auto-start the MCP server.
 * Users must explicitly click the status bar button or run the start command.
 * This prevents the extension from being annoying for projects that don't use debugging.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Killer Bug AI Debugger extension is activating...');

    // Initialize status bar in idle/start mode
    statusBarManager; // Initialize singleton

    // Register command to show output (used when server is running)
    const showOutputCommand = vscode.commands.registerCommand('killerBug.showOutput', () => {
        vscode.window.showInformationMessage('Killer Bug AI Debugger is active. Check Extension Host output for logs.');
    });
    context.subscriptions.push(showOutputCommand);

    // Register TOGGLE command - this is the main entry point for users now (start/stop)
    const toggleCommand = vscode.commands.registerCommand('killerBug.start', async () => {
        console.log('[Killer Bug] Toggle command invoked');
        await handleToggleServer(context);
    });
    context.subscriptions.push(toggleCommand);

    // Register configure command for VS Code (project-level)
    const configureCommand = vscode.commands.registerCommand('killerBug.configure', async () => {
        // Ask user which IDE to configure for
        const ideChoice = await vscode.window.showQuickPick(
            [
                { label: 'VS Code', description: 'Configure for VS Code', ide: 'vscode' },
                { label: 'Cursor', description: 'Configure for Cursor IDE', ide: 'cursor' }
            ],
            {
                placeHolder: 'Select IDE to configure MCP server for',
                title: 'Choose IDE'
            }
        );

        if (ideChoice) {
            await handleConfigureCommand(context, ideChoice.ide as 'vscode' | 'cursor');
        }
    });
    context.subscriptions.push(configureCommand);

    // Register reset port registry command
    const resetPortRegistryCommand = vscode.commands.registerCommand('killerBug.resetPortRegistry', async () => {
        const confirm = await vscode.window.showWarningMessage(
            'Reset all tracked ports in the registry? This will clear port tracking data.',
            'Reset',
            'Cancel'
        );

        if (confirm === 'Reset') {
            try {
                // Clear the registry
                const registryPath = require('path').join(require('os').homedir(), '.killer-bug-ports.json');
                const fs = require('fs');
                fs.writeFileSync(registryPath, JSON.stringify({}, null, 2), 'utf-8');
                vscode.window.showInformationMessage('Killer Bug port registry cleared successfully');
                console.log('[Killer Bug] Port registry reset');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to reset port registry: ${error}`);
                console.error('[Killer Bug] Error resetting port registry:', error);
            }
        }
    });
    context.subscriptions.push(resetPortRegistryCommand);

    // Initialize status bar to always show "Ready" - silent mode until user clicks
    // Don't check or warn about configuration - user will see config dialog only when clicking
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Project is open - show simple "Ready" state (silent, no warnings)
            const projectRoot = workspaceFolders[0].uri.fsPath;
            const appName = vscode.env.appName;
            const isCursor = appName.toLowerCase().includes('cursor');
            const ideType = isCursor ? 'cursor' : 'vscode';
            
            console.log(`[Killer Bug] Running in: ${appName} (detected as ${ideType})`);
            console.log('[Killer Bug] Status bar in silent ready mode - waiting for user click');
            
            // Always show ready state - no warnings
            statusBarManager.showReady();
        } else {
            // No project open
            console.log('[Killer Bug] No workspace folder open');
            statusBarManager.showReady();
        }
    } catch (error) {
        console.error('Error during extension initialization:', error);
        // Show error but don't crash
        console.log('[Killer Bug] Continuing with safe state after initialization error');
    }

    console.log('Killer Bug AI Debugger extension activated (lazy mode - click status bar to start)');
}

/**
 * Handle the TOGGLE command - starts or stops MCP server based on current state
 * Shows configuration popup only if project is not yet configured
 */
async function handleToggleServer(context: vscode.ExtensionContext) {
    console.log('[Killer Bug] Handling toggle server request');
    
    // Check if server is already running
    if (isServerRunning()) {
        // Server is running - stop it
        console.log('[Killer Bug] Server is running, stopping...');
        stopMCPServer();
        statusBarManager.showConfiguredNotRunning(getMCPPort());
        vscode.window.showInformationMessage('✓ Killer Bug AI Debugger stopped', { modal: false });
        return;
    }
    
    // Server is not running - start it
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Please open a project folder to start Killer Bug AI Debugger');
        return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const projectName = workspaceFolders[0].name;
    
    // Detect which IDE is running (VS Code vs Cursor)
    const appName = vscode.env.appName;
    const isCursor = appName.toLowerCase().includes('cursor');
    const ideType = isCursor ? 'cursor' : 'vscode';
    
    const configManager = new ProjectMCPConfigManager(projectRoot, ideType);
    const status = configManager.getStatus();
    
    if (!status.configured || !status.port) {
        // Project not configured - show configuration popup with option to continue
        console.log('[Killer Bug] Project not configured - showing configuration dialog');
        
        const choice = await vscode.window.showInformationMessage(
            '⚠️ Killer Bug AI Debugger is not configured for this project.\n\nWould you like to configure it now?',
            'Configure Now',
            'Cancel'
        );
        
        if (choice === 'Configure Now') {
            // Run configuration
            await handleConfigureCommand(context, ideType);
        } else {
            console.log('[Killer Bug] User cancelled configuration');
            vscode.window.showInformationMessage('Run "Killer Bug: Configure AI Debugger" command when ready to set up debugging.');
        }
        return;
    }
    
    // Project is configured - start the MCP server
    try {
        console.log(`[Killer Bug] Starting MCP server on configured port ${status.port}`);
        setMCPPort(status.port);
        startMCPServer();
        
        console.log(`[Killer Bug] MCP server started successfully on port ${getMCPPort()}`);
        statusBarManager.showRunning(getMCPPort());
        
        // Show brief confirmation
        vscode.window.showInformationMessage(`✓ Killer Bug AI Debugger started on port ${getMCPPort()}`, { modal: false });
    } catch (error) {
        console.error('[Killer Bug] Failed to start MCP server:', error);
        statusBarManager.showError('Failed to start MCP server');
        vscode.window.showErrorMessage(`Failed to start Killer Bug MCP server: ${error}`);
    }
}
async function handleConfigureCommand(context: vscode.ExtensionContext, ideType: 'vscode' | 'cursor') {
    console.log(`[Killer Bug] Configure ${ideType} command called`);
    
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('Please open a project folder to configure Killer Bug AI Debugger');
        return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const projectName = workspaceFolders[0].name;
    const configManager = new ProjectMCPConfigManager(projectRoot, ideType);
    
    // Clean up stale registry entries
    PortRegistry.cleanupStaleEntries();
    
    // Show progress while configuring
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `Configuring Killer Bug AI Debugger for this project (${ideType === 'vscode' ? 'VS Code' : 'Cursor'})...`,
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
                    console.log(`[Killer Bug] Project already configured on port ${portToUse}`);
                    
                    // Verify port is still registered
                    if (PortRegistry.isPortRegistered(portToUse, projectRoot)) {
                        // Port is registered for another project - ask to use different port
                        const existingProject = PortRegistry.getProjectForPort(portToUse);
                        const choice = await vscode.window.showWarningMessage(
                            `Port ${portToUse} is already in use by project: "${existingProject?.projectName}"\n\nWould you like to choose a different port?`,
                            'Choose Different Port',
                            'Keep Current Port'
                        );

                        if (choice === 'Choose Different Port') {
                            // Fall through to port selection below
                            status.configured = false;
                        } else {
                            // Use current port despite conflict
                            console.log(`[Killer Bug] User chose to keep port ${portToUse} despite conflict`);
                        }
                    } else {
                        // Re-register the port for this project
                        PortRegistry.registerPort(portToUse, projectRoot, projectName);
                    }
                }

                if (!status.configured || status.port === undefined) {
                    // Find available port and ask user
                    progress.report({ increment: 40 });
                    const suggestions = await PortRegistry.getSuggestedPorts(3100, 3);
                    
                    const quickPickItems = suggestions.map(p => {
                        let description = '';
                        if (!p.available) {
                            // Port is in use - show where
                            if (p.conflictProject) {
                                description = `Used by: ${p.conflictProject}`;
                            } else {
                                description = 'In use by another process';
                            }
                        } else {
                            description = 'Available for use';
                        }
                        
                        return {
                            label: `Port ${p.port}${p.available ? ' ✓ (Available)' : ' ✗ (In Use)'}`,
                            description,
                            port: p.port,
                            available: p.available,
                            conflictProject: p.conflictProject
                        };
                    });

                    const userChoice = await vscode.window.showQuickPick(quickPickItems, {
                        placeHolder: 'Select port for Killer Bug MCP server',
                        title: 'Choose Killer Bug MCP Server Port'
                    });

                    if (!userChoice) {
                        vscode.window.showInformationMessage('Killer Bug configuration cancelled');
                        return;
                    }

                    if (!userChoice.available) {
                        const confirmChoice = await vscode.window.showWarningMessage(
                            `Port ${userChoice.port} is already in use by: ${userChoice.conflictProject}\n\nAre you sure you want to use this port?`,
                            'Use Anyway',
                            'Cancel'
                        );

                        if (confirmChoice !== 'Use Anyway') {
                            vscode.window.showInformationMessage('Please select an available port');
                            return;
                        }
                    }

                    portToUse = userChoice.port;
                    console.log(`[Killer Bug] User selected port ${portToUse}`);
                }

                progress.report({ increment: 60 });

                // Configure project with selected port
                const result = await configManager.configureProject(portToUse);
                
                progress.report({ increment: 80 });

                // Register the port in global registry
                PortRegistry.registerPort(portToUse, projectRoot, projectName);
                console.log(`[Killer Bug] Registered port ${portToUse} for project: ${projectName}`);

                progress.report({ increment: 100 });

                if (result.success) {
                    statusBarManager.showSuccess('Killer Bug Configured (Project)');
                    
                    // Set the port for this extension instance
                    setMCPPort(portToUse);

                    // IMMEDIATELY start the MCP server with the configured port
                    console.log(`[Killer Bug] Starting MCP server on port ${portToUse}...`);
                    try {
                        startMCPServer();
                        console.log(`[Killer Bug] MCP server started successfully on port ${getMCPPort()}`);
                        statusBarManager.showRunning(getMCPPort());
                    } catch (startError) {
                        console.error(`[Killer Bug] Failed to start MCP server:`, startError);
                        statusBarManager.showError('Killer Bug server failed to start');
                    }

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

                    console.log('[Killer Bug] Project configuration successful');
                } else {
                    statusBarManager.showError('Killer Bug Config Failed');
                    vscode.window.showErrorMessage(result.message, { modal: true });
                    console.log('[Killer Bug] Project configuration failed');
                }
            } catch (error) {
                console.error(`[Killer Bug] Error in configure command:`, error);
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    );
}

/**
 * Extension deactivation
 */
export function deactivate() {
    statusBarManager.dispose();
    stopMCPServer();
    console.log('AI Debug MCP Server extension deactivated');
}
