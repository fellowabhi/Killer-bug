import * as vscode from 'vscode';
import { startMCPServer } from './mcp-server';

/**
 * Extension activation entry point
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug MCP Server extension is activating...');

    // Register command to start MCP server
    const disposable = vscode.commands.registerCommand('vscode-debug-mcp.start', () => {
        try {
            startMCPServer();
            vscode.window.showInformationMessage('AI Debug MCP Server started');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start MCP server: ${error}`);
        }
    });

    context.subscriptions.push(disposable);

    // Offer to configure MCP on first activation
    offerMCPConfiguration(context);

    console.log('AI Debug MCP Server extension activated');
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('AI Debug MCP Server extension deactivated');
}

/**
 * Offer to configure MCP settings on first use
 */
async function offerMCPConfiguration(context: vscode.ExtensionContext) {
    const configKey = 'vscode-debug-mcp.configured';
    const alreadyConfigured = context.globalState.get(configKey, false);

    if (alreadyConfigured) {
        return;
    }

    const response = await vscode.window.showInformationMessage(
        'Enable AI debugging capabilities? This will configure the MCP server for AI assistants.',
        'Enable',
        'Not Now',
        'Don\'t Ask Again'
    );

    if (response === 'Enable') {
        await configureMCP();
        await context.globalState.update(configKey, true);
        vscode.window.showInformationMessage('AI Debug MCP Server configured successfully!');
    } else if (response === 'Don\'t Ask Again') {
        await context.globalState.update(configKey, true);
    }
}

/**
 * Configure MCP settings
 */
async function configureMCP() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open. Please open a workspace first.');
        return;
    }

    const mcpConfigPath = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', 'mcp.json');
    
    const mcpConfig = {
        servers: {
            'vscode-debug-mcp': {
                type: 'stdio',
                command: 'vscode-debug-mcp.start'
            }
        },
        inputs: []
    };

    // Create .vscode directory if it doesn't exist
    const vscodeDirPath = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
    try {
        await vscode.workspace.fs.createDirectory(vscodeDirPath);
    } catch {
        // Directory might already exist
    }

    // Write MCP configuration
    const configContent = JSON.stringify(mcpConfig, null, 2);
    await vscode.workspace.fs.writeFile(mcpConfigPath, Buffer.from(configContent, 'utf8'));
}
