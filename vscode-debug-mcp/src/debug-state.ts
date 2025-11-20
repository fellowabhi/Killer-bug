import * as vscode from 'vscode';

/**
 * Debug state manager - tracks active debug session state
 */
export class DebugState {
    private static instance: DebugState;

    sessionId: string | null = null;
    currentFile: string | null = null;
    currentLine: number | null = null;
    currentFunction: string | null = null;
    isPaused: boolean = false;
    stackFrames: any[] = [];
    breakpoints: Map<string, vscode.Breakpoint[]> = new Map();

    private constructor() {
        this.setupEventListeners();
    }

    static getInstance(): DebugState {
        if (!DebugState.instance) {
            DebugState.instance = new DebugState();
        }
        return DebugState.instance;
    }

    /**
     * Setup VS Code debug event listeners
     */
    private setupEventListeners() {
        // Track active debug session changes
        vscode.debug.onDidChangeActiveDebugSession((session) => {
            if (session) {
                this.sessionId = session.id;
                this.currentFile = session.configuration.program;
                console.log(`Debug session started: ${this.sessionId}`);
            } else {
                this.reset();
                console.log('Debug session ended');
            }
        });

        // Track breakpoint changes
        vscode.debug.onDidChangeBreakpoints((event) => {
            // Update added breakpoints
            for (const bp of event.added) {
                if (bp instanceof vscode.SourceBreakpoint && bp.location.uri) {
                    const file = bp.location.uri.fsPath;
                    if (!this.breakpoints.has(file)) {
                        this.breakpoints.set(file, []);
                    }
                    this.breakpoints.get(file)!.push(bp);
                }
            }

            // Remove deleted breakpoints
            for (const bp of event.removed) {
                if (bp instanceof vscode.SourceBreakpoint && bp.location.uri) {
                    const file = bp.location.uri.fsPath;
                    const bps = this.breakpoints.get(file);
                    if (bps) {
                        const index = bps.indexOf(bp);
                        if (index > -1) {
                            bps.splice(index, 1);
                        }
                    }
                }
            }
        });

        // Track debug session termination
        vscode.debug.onDidTerminateDebugSession((session) => {
            if (session.id === this.sessionId) {
                this.reset();
            }
        });
    }

    /**
     * Reset state when debug session ends
     */
    reset() {
        this.sessionId = null;
        this.currentFile = null;
        this.currentLine = null;
        this.currentFunction = null;
        this.isPaused = false;
        this.stackFrames = [];
    }

    /**
     * Get current active debug session
     */
    getActiveSession(): vscode.DebugSession | undefined {
        return vscode.debug.activeDebugSession;
    }

    /**
     * Check if a debug session is active
     */
    isActive(): boolean {
        return this.sessionId !== null && vscode.debug.activeDebugSession !== undefined;
    }
}

// Export singleton instance
export const debugState = DebugState.getInstance();
