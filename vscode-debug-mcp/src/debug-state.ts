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
            } else {
                this.reset();
                console.log('Debug session ended');
            }
        });

        // Track when debugger stops (hits breakpoint, steps, etc.)
        vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
            if (event.session.id !== this.sessionId) return;

            console.log('Debug event received:', event.event, event.body);

            // Handle stopped events (breakpoint hit, step complete, pause)
            if (event.event === 'stopped') {
                this.isPaused = true;
                console.log('✅ Debugger STOPPED - isPaused set to TRUE');
                
                // Update current position from the stopped event
                this.updateCurrentPosition(event.session);
            }
            
            // Handle continued events
            if (event.event === 'continued') {
                this.isPaused = false;
                console.log('▶️ Debugger CONTINUED - isPaused set to FALSE');
            }
        });

        // Track active stack frame changes (when user selects different frame or execution stops)
        // This is a more reliable indicator that debugger is paused
        vscode.debug.onDidChangeActiveStackItem(async (stackItem) => {
            if (stackItem) {
                // When stack item changes, debugger is paused
                this.isPaused = true;
                console.log('📍 Active stack item changed - isPaused set to TRUE');
                
                // Update position when active debug stack item changes
                const session = vscode.debug.activeDebugSession;
                if (session) {
                    await this.updateCurrentPosition(session);
                }
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
     * Update current position from debug session (fetch stack trace via DAP)
     */
    private async updateCurrentPosition(session: vscode.DebugSession) {
        try {
            // Get threads
            const threadsResponse = await session.customRequest('threads');
            if (!threadsResponse || !threadsResponse.threads || threadsResponse.threads.length === 0) {
                return;
            }

            // Check if any thread is stopped - this indicates paused state
            for (const thread of threadsResponse.threads) {
                if (thread.stopped === true || thread.name?.toLowerCase().includes('paused')) {
                    if (!this.isPaused) {
                        this.isPaused = true;
                        console.log('🔍 Detected paused state from thread status - isPaused set to TRUE');
                    }
                }
            }

            // Get stack trace for first thread
            const threadId = threadsResponse.threads[0].id;
            const stackResponse = await session.customRequest('stackTrace', {
                threadId: threadId,
                startFrame: 0,
                levels: 20
            });

            if (stackResponse && stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
                const topFrame = stackResponse.stackFrames[0];
                this.stackFrames = stackResponse.stackFrames;
                this.currentLine = topFrame.line;
                this.currentFunction = topFrame.name;

                if (topFrame.source && topFrame.source.path) {
                    this.currentFile = topFrame.source.path;
                }

                // If we successfully got stack frames, debugger must be paused
                if (!this.isPaused) {
                    this.isPaused = true;
                    console.log('🔍 Detected paused state from stack trace - isPaused set to TRUE');
                }

                console.log(`Position updated: ${this.currentFunction} at ${this.currentFile}:${this.currentLine} (isPaused=${this.isPaused})`);
            }
        } catch (error) {
            console.error('Error updating current position:', error);
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
     * Manually refresh the paused state by checking thread status
     * Call this before operations that need accurate isPaused state
     */
    async refreshPausedState(): Promise<void> {
        const session = this.getActiveSession();
        if (!session) {
            this.isPaused = false;
            return;
        }

        try {
            const threadsResponse = await session.customRequest('threads');
            console.log('🔍 Threads response:', JSON.stringify(threadsResponse));
            
            if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                // Try to get stack trace - if successful, we MUST be paused
                try {
                    const threadId = threadsResponse.threads[0].id;
                    const stackResponse = await session.customRequest('stackTrace', {
                        threadId: threadId,
                        startFrame: 0,
                        levels: 1
                    });
                    
                    console.log('🔍 Stack trace response:', JSON.stringify(stackResponse));
                    
                    if (stackResponse && stackResponse.stackFrames && stackResponse.stackFrames.length > 0) {
                        // Successfully got stack frames = debugger is paused!
                        this.isPaused = true;
                        console.log('🔄 Refreshed state: isPaused = TRUE (got stack frames)');
                        // Update full position
                        await this.updateCurrentPosition(session);
                        return;
                    }
                } catch (stackError) {
                    console.log('⚠️ Could not get stack trace (probably running):', stackError);
                }
                
                // Fallback: Check thread.stopped property
                const hasStoppedThread = threadsResponse.threads.some((thread: any) => 
                    thread.stopped === true || thread.name?.toLowerCase().includes('paused') || thread.name?.toLowerCase().includes('stopped')
                );
                
                if (hasStoppedThread) {
                    this.isPaused = true;
                    console.log('🔄 Refreshed state: isPaused = TRUE (thread marked stopped)');
                    await this.updateCurrentPosition(session);
                } else {
                    this.isPaused = false;
                    console.log('🔄 Refreshed state: isPaused = FALSE (running)');
                }
            }
        } catch (error) {
            console.error('Error refreshing paused state:', error);
        }
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
