import * as vscode from 'vscode';
import { debugState } from '../debug-state';

/**
 * Handle execution control tool calls
 */
export async function handleExecutionTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
        case 'debug_continue':
            return await debugContinue();
        case 'debug_stepOver':
            return await debugStepOver();
        case 'debug_stepInto':
            return await debugStepInto();
        case 'debug_stepOut':
            return await debugStepOut();
        case 'debug_pause':
            return await debugPause();
        default:
            throw new Error(`Unknown execution tool: ${toolName}`);
    }
}

/**
 * Continue execution until next breakpoint
 */
async function debugContinue(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (!session) {
        return {
            success: false,
            error: 'Debug session not found',
        };
    }

    // CRITICAL: Check if debugger is paused before attempting continue
    if (!debugState.isPaused) {
        return {
            success: false,
            error: 'Cannot continue: debugger is not paused. Wait for a breakpoint to be hit first.',
            isPaused: false,
            hint: 'Set a breakpoint and trigger the code path, or use debug_pause to pause execution.'
        };
    }

    try {
        console.log('[DEBUG] Executing continue command');
        
        // Store pre-continue state
        const wasPaused = debugState.isPaused;
        
        // Execute continue command
        await vscode.commands.executeCommand('workbench.action.debug.continue');
        
        // Wait longer for debugger to potentially hit next breakpoint
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh paused state
        await debugState.refreshPausedState();

        return {
            success: true,
            action: 'continue',
            wasPaused: wasPaused,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine,
            isPaused: debugState.isPaused,
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to continue: ${error.message}`,
        };
    }
}

/**
 * Step over the current line
 */
async function debugStepOver(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (!session) {
        return {
            success: false,
            error: 'Debug session not found',
        };
    }

    // CRITICAL: Check if debugger is paused before attempting step
    if (!debugState.isPaused) {
        return {
            success: false,
            error: 'Cannot step over: debugger is not paused. Wait for a breakpoint to be hit first.',
            isPaused: false,
            hint: 'Set a breakpoint and trigger the code path, or use debug_pause to pause execution.'
        };
    }

    try {
        console.log('[DEBUG] Executing step over command');
        
        const prevLine = debugState.currentLine;
        
        // Execute step over command
        await vscode.commands.executeCommand('workbench.action.debug.stepOver');
        
        // Wait longer for step to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh paused state
        await debugState.refreshPausedState();

        return {
            success: true,
            action: 'stepOver',
            previousLine: prevLine,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine,
            currentFunction: debugState.currentFunction,
            isPaused: debugState.isPaused,
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to step over: ${error.message}`,
        };
    }
}

/**
 * Step into function call
 */
async function debugStepInto(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (!session) {
        return {
            success: false,
            error: 'Debug session not found',
        };
    }

    // CRITICAL: Check if debugger is paused before attempting step
    if (!debugState.isPaused) {
        return {
            success: false,
            error: 'Cannot step into: debugger is not paused. Wait for a breakpoint to be hit first.',
            isPaused: false,
            hint: 'Set a breakpoint and trigger the code path, or use debug_pause to pause execution.'
        };
    }

    try {
        console.log('[DEBUG] Executing step into command');
        
        const prevLine = debugState.currentLine;
        const prevFile = debugState.currentFile;
        
        // Execute step into command
        await vscode.commands.executeCommand('workbench.action.debug.stepInto');
        
        // Wait longer for step to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh paused state
        await debugState.refreshPausedState();

        return {
            success: true,
            action: 'stepInto',
            previousFile: prevFile,
            previousLine: prevLine,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine,
            currentFunction: debugState.currentFunction,
            isPaused: debugState.isPaused,
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to step into: ${error.message}`,
        };
    }
}

/**
 * Step out of current function
 */
async function debugStepOut(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (!session) {
        return {
            success: false,
            error: 'Debug session not found',
        };
    }

    // CRITICAL: Check if debugger is paused before attempting step
    if (!debugState.isPaused) {
        return {
            success: false,
            error: 'Cannot step out: debugger is not paused. Wait for a breakpoint to be hit first.',
            isPaused: false,
            hint: 'Set a breakpoint and trigger the code path, or use debug_pause to pause execution.'
        };
    }

    try {
        console.log('[DEBUG] Executing step out command');
        const prevLine = debugState.currentLine;
        const prevFunction = debugState.currentFunction;
        
        // Execute step out command
        await vscode.commands.executeCommand('workbench.action.debug.stepOut');
        
        // Wait longer for step to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh paused state
        await debugState.refreshPausedState();

        return {
            success: true,
            action: 'stepOut',
            previousFunction: prevFunction,
            previousLine: prevLine,
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine,
            currentFunction: debugState.currentFunction,
            isPaused: debugState.isPaused,
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to step out: ${error.message}`,
        };
    }
}

/**
 * Pause execution
 */
async function debugPause(): Promise<any> {
    if (!debugState.isActive()) {
        return {
            success: false,
            error: 'No active debug session',
        };
    }

    const session = debugState.getActiveSession();
    if (!session) {
        return {
            success: false,
            error: 'Debug session not found',
        };
    }

    if (debugState.isPaused) {
        return {
            success: false,
            error: 'Debug session is already paused',
            isPaused: true,
            hint: 'Use debug_continue, debug_stepOver, debug_stepInto, or debug_stepOut to resume execution.'
        };
    }

    try {
        console.log('[DEBUG] Executing pause command');
        
        // Execute pause command
        await vscode.commands.executeCommand('workbench.action.debug.pause');
        
        // Wait longer for pause to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh paused state
        await debugState.refreshPausedState();

        return {
            success: true,
            action: 'pause',
            currentFile: debugState.currentFile,
            currentLine: debugState.currentLine,
            isPaused: debugState.isPaused,
        };
    } catch (error: any) {
        return {
            success: false,
            error: `Failed to pause: ${error.message}`,
        };
    }
}
