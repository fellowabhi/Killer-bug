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
                this.isPaused = false;
                console.log(`Debug session started: ${this.sessionId}`);
                
                // Set up session-specific event tracking
                this.trackSessionState(session);
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
     * Track state changes for a specific debug session
     */
    private async trackSessionState(session: vscode.DebugSession) {
        try {
            // Request threads to check if execution has stopped
            const checkState = async () => {
                if (!this.isActive() || this.sessionId !== session.id) {
                    return;
                }

                try {
                    const threadsResponse = await session.customRequest('threads');
                    if (threadsResponse && threadsResponse.threads) {
                        for (const thread of threadsResponse.threads) {
                            // Check if thread is stopped (paused)
                            if (thread.stopped || thread.name?.includes('stopped')) {
                                this.isPaused = true;
                                
                                // Get stack trace to update current position
                                const stackResponse = await session.customRequest('stackTrace', {
                                    threadId: thread.id,
                                    startFrame: 0,
                                    levels: 10
                                });
                                
                                if (stackResponse && stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
                                    const topFrame = stackResponse.stackFrames[0];
                                    this.stackFrames = stackResponse.stackFrames;
                                    this.currentLine = topFrame.line;
                                    this.currentFunction = topFrame.name;
                                    
                                    if (topFrame.source && topFrame.source.path) {
                                        this.currentFile = topFrame.source.path;
                                    }
                                    
                                    console.log(`Debugger paused at ${this.currentFile}:${this.currentLine} in ${this.currentFunction}`);
                                }
                                return;
                            }
                        }
                        
                        // No stopped threads, execution is running
                        this.isPaused = false;
                    }
                } catch (error) {
                    // Session might not support these requests yet or is not ready
                    // This is normal during startup
                }
            };

            // Poll state periodically while session is active
            const statePoller = setInterval(checkState, 300);
            
            // Clean up poller when session ends
            const cleanup = vscode.debug.onDidTerminateDebugSession((endedSession) => {
                if (endedSession.id === session.id) {
                    clearInterval(statePoller);
                    cleanup.dispose();
                }
            });
        } catch (error) {
            console.error('Error tracking session state:', error);
        }
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
