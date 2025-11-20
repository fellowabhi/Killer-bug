import * as vscode from 'vscode';
import * as path from 'path';
import { debugState } from '../debug-state';

/**
 * Handle session-related tool calls
 */
export async function handleSessionTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
        case 'debug_start':
            return await debugStart(args);
        case 'debug_stop':
            return await debugStop();
        case 'debug_getStatus':
            return await debugGetStatus();
        case 'debug_listConfigs':
            return await debugListConfigs();
        case 'debug_startWithConfig':
            return await debugStartWithConfig(args);
        case 'debug_attach':
            return await debugAttach(args);
        default:
            throw new Error(`Unknown session tool: ${toolName}`);
    }
}

/**
 * Start a debug session
 */
async function debugStart(args: {
    file: string;
    type?: string;
    stopOnEntry?: boolean;
}): Promise<any> {
    const { file, type, stopOnEntry = false } = args;

    // Check if session already active
    if (debugState.isActive()) {
        return {
            success: false,
            error: 'A debug session is already active. Stop it first with debug_stop.',
        };
    }

    // Validate file exists
    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(file));
    } catch {
        return {
            success: false,
            error: `File not found: ${file}`,
        };
    }

    // Auto-detect debug type from file extension
    const debugType = type || detectDebugType(file);
    if (!debugType) {
        return {
            success: false,
            error: 'Could not detect debug type. Please specify the "type" parameter (e.g., "python", "node").',
        };
    }

    // Create debug configuration
    const config: vscode.DebugConfiguration = {
        type: debugType,
        request: 'launch',
        name: 'AI Debug Session',
        program: file,
        stopOnEntry: stopOnEntry,
        console: 'integratedTerminal',
    };

    // Add language-specific configurations
    if (debugType === 'python') {
        config.justMyCode = false; // Allow debugging into libraries
    }

    // Start debugging
    try {
        const started = await vscode.debug.startDebugging(undefined, config);
        
        if (started) {
            // Wait longer for session to initialize and stop at entry
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Refresh paused state after starting
            await debugState.refreshPausedState();
            
            return {
                success: true,
                sessionId: debugState.sessionId,
                file: file,
                type: debugType,
                status: 'started',
                isPaused: debugState.isPaused,
                currentLine: debugState.currentLine,
            };
        } else {
            return {
                success: false,
                error: 'Failed to start debug session',
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: `Error starting debug session: ${error.message}`,
        };
    }
}

/**
 * Stop the current debug session
 */
async function debugStop(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (session) {
        try {
            await vscode.debug.stopDebugging(session);
            
            // Wait for session to clean up
            await new Promise(resolve => setTimeout(resolve, 300));
            
            return {
                success: true,
                status: 'stopped',
            };
        } catch (error: any) {
            return {
                success: false,
                error: `Error stopping debug session: ${error.message}`,
            };
        }
    }

    return {
        success: false,
        error: 'Debug session not found',
    };
}

/**
 * Get current debug session status
 */
async function debugGetStatus(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            active: false,
            status: 'No active debug session',
        };
    }

    // Refresh the paused state before returning status
    await debugState.refreshPausedState();

    const session = debugState.getActiveSession();
    
    return {
        active: true,
        sessionId: debugState.sessionId,
        file: debugState.currentFile,
        line: debugState.currentLine,
        function: debugState.currentFunction,
        paused: debugState.isPaused,
        type: session?.type,
        name: session?.name,
    };
}

/**
 * Auto-detect debug type from file extension
 */
function detectDebugType(file: string): string | null {
    const ext = path.extname(file).toLowerCase();
    
    const typeMap: Record<string, string> = {
        '.py': 'python',
        '.js': 'node',
        '.ts': 'node',
        '.mjs': 'node',
        '.go': 'go',
        '.java': 'java',
        '.cpp': 'cppdbg',
        '.c': 'cppdbg',
        '.cs': 'coreclr',
        '.rs': 'lldb',
    };
    
    return typeMap[ext] || null;
}

/**
 * List all available debug configurations from launch.json
 */
async function debugListConfigs(): Promise<any> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                success: false,
                error: 'No workspace folder open'
            };
        }

        const allConfigs: any[] = [];

        // Get configurations from all workspace folders
        for (const folder of workspaceFolders) {
            const configs = vscode.workspace.getConfiguration('launch', folder.uri);
            const configurations = configs.get<any[]>('configurations') || [];

            allConfigs.push({
                workspace: folder.name,
                workspacePath: folder.uri.fsPath,
                configurations: configurations.map(config => ({
                    name: config.name,
                    type: config.type,
                    request: config.request,
                    program: config.program
                }))
            });
        }

        return {
            success: true,
            workspaces: allConfigs,
            totalConfigs: allConfigs.reduce((sum, w) => sum + w.configurations.length, 0)
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to list configurations: ${error.message}`
        };
    }
}

/**
 * Start debugging using a named configuration from launch.json
 */
async function debugStartWithConfig(args: { 
    configName: string; 
    folder?: string;
}): Promise<any> {
    try {
        const { configName, folder } = args;

        // Check if session already active
        if (debugState.isActive()) {
            return {
                success: false,
                error: 'A debug session is already active. Stop it first with debug_stop.'
            };
        }

        // Find the workspace folder
        let workspaceFolder: vscode.WorkspaceFolder | undefined;
        
        if (folder) {
            workspaceFolder = vscode.workspace.workspaceFolders?.find(
                f => f.name === folder || f.uri.fsPath === folder
            );
        } else {
            // Use first workspace folder if not specified
            workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        }

        if (!workspaceFolder) {
            return {
                success: false,
                error: 'Workspace folder not found'
            };
        }

        // Get the configuration
        const configs = vscode.workspace.getConfiguration('launch', workspaceFolder.uri);
        const configurations = configs.get<any[]>('configurations') || [];
        const config = configurations.find(c => c.name === configName);

        if (!config) {
            return {
                success: false,
                error: `Configuration "${configName}" not found in launch.json`,
                availableConfigs: configurations.map(c => c.name)
            };
        }

        // Start debugging with the configuration
        const started = await vscode.debug.startDebugging(workspaceFolder, config);

        if (!started) {
            return {
                success: false,
                error: 'Failed to start debug session'
            };
        }

        // Wait for session to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh state to get isPaused status
        await debugState.refreshPausedState();

        return {
            success: true,
            message: `Started debugging with configuration: ${configName}`,
            configName: configName,
            configType: config.type,
            configRequest: config.request,
            sessionId: debugState.sessionId,
            isPaused: debugState.isPaused,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to start with config: ${error.message}`
        };
    }
}

/**
 * Attach to a running process (for remote debugging)
 */
async function debugAttach(args: {
    type?: string;
    host?: string;
    port: number;
    pathMappings?: any;
    name?: string;
}): Promise<any> {
    try {
        const { type = 'debugpy', host = 'localhost', port, pathMappings, name } = args;

        // Check if session already active
        if (debugState.isActive()) {
            return {
                success: false,
                error: 'A debug session is already active. Stop it first with debug_stop.'
            };
        }

        const debugConfig: vscode.DebugConfiguration = {
            type,
            request: 'attach',
            name: name || `Attach to ${host}:${port}`
        };

        // For debugpy (Python), use specific syntax
        if (type === 'debugpy' || type === 'python') {
            debugConfig.host = host;
            debugConfig.port = port;
            debugConfig.justMyCode = false; // Allow debugging into libraries
        } else if (type === 'node' || type === 'pwa-node') {
            // Node.js attach
            debugConfig.address = host;
            debugConfig.port = port;
        } else {
            // Generic attach
            debugConfig.connect = {
                host,
                port
            };
        }

        // Add path mappings for remote/container debugging
        if (pathMappings) {
            debugConfig.pathMappings = pathMappings;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const started = await vscode.debug.startDebugging(workspaceFolder, debugConfig);

        if (!started) {
            return {
                success: false,
                error: 'Failed to attach to process. Make sure the debugger is listening on the specified port.'
            };
        }

        // Wait for attachment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh state
        await debugState.refreshPausedState();

        return {
            success: true,
            message: `Attached to ${type} debugger at ${host}:${port}`,
            type: type,
            host: host,
            port: port,
            sessionId: debugState.sessionId,
            isPaused: debugState.isPaused,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to attach: ${error.message}`
        };
    }
}
