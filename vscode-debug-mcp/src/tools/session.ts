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
            // Wait a bit for session to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return {
                success: true,
                sessionId: debugState.sessionId,
                file: file,
                type: debugType,
                status: 'started',
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
