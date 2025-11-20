import * as vscode from 'vscode';
import { debugState } from '../debug-state';

/**
 * Handle breakpoint-related tool calls
 */
export async function handleBreakpointTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
        case 'debug_setBreakpoint':
            return await debugSetBreakpoint(args);
        case 'debug_removeBreakpoint':
            return await debugRemoveBreakpoint(args);
        case 'debug_listBreakpoints':
            return await debugListBreakpoints();
        default:
            throw new Error(`Unknown breakpoint tool: ${toolName}`);
    }
}

/**
 * Set a breakpoint at a specific line
 */
async function debugSetBreakpoint(args: {
    file: string;
    line: number;
    condition?: string;
}): Promise<any> {
    const { file, line, condition } = args;

    // Validate file exists
    let fileUri: vscode.Uri;
    try {
        fileUri = vscode.Uri.file(file);
        await vscode.workspace.fs.stat(fileUri);
    } catch {
        return {
            success: false,
            error: `File not found: ${file}`,
        };
    }

    // Create breakpoint location
    const location = new vscode.Location(
        fileUri,
        new vscode.Position(line - 1, 0) // VS Code uses 0-based line numbers
    );

    // Create breakpoint (with optional condition)
    const breakpoint = new vscode.SourceBreakpoint(
        location,
        true, // enabled
        condition,
        undefined, // hitCondition
        undefined  // logMessage
    );

    // Add breakpoint
    const currentBreakpoints = vscode.debug.breakpoints;
    vscode.debug.addBreakpoints([breakpoint]);

    // Wait a bit for breakpoint to be set
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if breakpoint was verified
    const allBreakpoints = vscode.debug.breakpoints;
    const newBreakpoint = allBreakpoints.find(bp => 
        bp instanceof vscode.SourceBreakpoint &&
        bp.location.uri.fsPath === file &&
        bp.location.range.start.line === line - 1
    );

    if (newBreakpoint && newBreakpoint instanceof vscode.SourceBreakpoint) {
        return {
            success: true,
            file: file,
            line: line,
            condition: condition || null,
            verified: true,
            id: allBreakpoints.indexOf(newBreakpoint),
        };
    }

    return {
        success: false,
        error: 'Failed to set breakpoint',
    };
}

/**
 * Remove a breakpoint at a specific line
 */
async function debugRemoveBreakpoint(args: {
    file: string;
    line: number;
}): Promise<any> {
    const { file, line } = args;

    // Find breakpoints at this location
    const breakpointsToRemove = vscode.debug.breakpoints.filter(bp => {
        if (bp instanceof vscode.SourceBreakpoint) {
            return (
                bp.location.uri.fsPath === file &&
                bp.location.range.start.line === line - 1
            );
        }
        return false;
    });

    if (breakpointsToRemove.length === 0) {
        return {
            success: false,
            error: `No breakpoint found at ${file}:${line}`,
        };
    }

    // Remove breakpoints
    vscode.debug.removeBreakpoints(breakpointsToRemove);

    // Wait a bit for removal to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
        success: true,
        file: file,
        line: line,
        removed: breakpointsToRemove.length,
    };
}

/**
 * List all breakpoints
 */
async function debugListBreakpoints(): Promise<any> {
    const breakpoints = vscode.debug.breakpoints;
    
    const breakpointList = breakpoints
        .filter(bp => bp instanceof vscode.SourceBreakpoint)
        .map(bp => {
            const sourceBp = bp as vscode.SourceBreakpoint;
            return {
                file: sourceBp.location.uri.fsPath,
                line: sourceBp.location.range.start.line + 1, // Convert to 1-based
                condition: sourceBp.condition || null,
                enabled: sourceBp.enabled,
            };
        });

    return {
        success: true,
        count: breakpointList.length,
        breakpoints: breakpointList,
    };
}
