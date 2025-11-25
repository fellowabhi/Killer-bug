import * as vscode from 'vscode';

/**
 * Thread state tracking
 */
interface ThreadState {
    id: number;
    name: string;
    stopped: boolean;
    reason?: string;
}

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
    isInEventLoop: boolean = false; // Track if we're in event loop waiting state
    stackFrames: any[] = [];
    breakpoints: Map<string, vscode.Breakpoint[]> = new Map();
    
    // Track thread states
    private threads: Map<number, ThreadState> = new Map();
    private mainThreadId: number | null = null;
    
    // Store paused frame info captured from activeStackItem
    private pausedThreadId: number | null = null;
    private pausedFrameId: number | null = null;
    private pausedLine: number | null = null;
    private pausedFunction: string | null = null;
    private pausedFile: string | null = null;

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
                this.isInEventLoop = false;
                console.log(`[DEBUG] Debug session started: ${this.sessionId}`);
                console.log(`[DEBUG] Session name: ${session.name}, type: ${session.type}`);
                console.log(`Debug session started: ${this.sessionId}`);
            } else {
                console.log(`[DEBUG] Debug session ended: ${this.sessionId}`);
                this.reset();
                console.log('Debug session ended');
            }
        });

        // Track when debugger stops (hits breakpoint, steps, etc.)
        vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => {
            console.log(`[DEBUG] Custom Event: ${event.event}, EventSessionId: ${event.session?.id}, CurrentSessionId: ${this.sessionId}, Match: ${event.session?.id === this.sessionId}`);
            
            if (event.session.id !== this.sessionId) {
                console.log(`[DEBUG] Event filtered out due to session ID mismatch`);
                return;
            }

            console.log('Debug event received:', event.event, event.body);

            // Handle stopped events (breakpoint hit, step complete, pause)
            if (event.event === 'stopped') {
                const threadId = event.body?.threadId;
                const reason = event.body?.reason;
                
                // Update thread state
                if (threadId) {
                    const thread = this.threads.get(threadId);
                    if (thread) {
                        thread.stopped = true;
                        thread.reason = reason;
                    } else {
                        this.threads.set(threadId, {
                            id: threadId,
                            name: `Thread ${threadId}`,
                            stopped: true,
                            reason: reason
                        });
                    }
                }
                
                // ALWAYS set isPaused when stopped event fires
                // Let checkIfInEventLoop decide if it should be FALSE
                this.isPaused = true;
                console.log(`✅ Thread ${threadId} STOPPED (${reason}) - isPaused set to TRUE`);
                
                // Update current position from the stopped event
                this.updateCurrentPosition(event.session);
            }
            
            // Handle continued events
            if (event.event === 'continued') {
                const threadId = event.body?.threadId;
                
                // Update thread state
                if (threadId) {
                    const thread = this.threads.get(threadId);
                    if (thread) {
                        thread.stopped = false;
                        thread.reason = undefined;
                    }
                }
                
                // Check if main thread is continuing
                if (threadId === this.mainThreadId || !threadId) {
                    this.isPaused = false;
                    this.isInEventLoop = false;
                    console.log('▶️ Main thread CONTINUED - isPaused set to FALSE');
                }
            }
            
            // Handle thread events
            if (event.event === 'thread') {
                const threadId = event.body?.threadId;
                const reason = event.body?.reason;
                
                if (reason === 'started') {
                    console.log(`🧵 Thread ${threadId} started`);
                    this.threads.set(threadId, {
                        id: threadId,
                        name: `Thread ${threadId}`,
                        stopped: false
                    });
                    
                    // First thread is usually the main thread
                    if (!this.mainThreadId) {
                        this.mainThreadId = threadId;
                        console.log(`📌 Main thread ID: ${threadId}`);
                    }
                } else if (reason === 'exited') {
                    console.log(`🧵 Thread ${threadId} exited`);
                    this.threads.delete(threadId);
                }
            }
        });

        // Track active stack frame changes - THIS IS THE PRIMARY SOURCE for pause detection
        // Key insight: activeStackItem has frameId ONLY when actually paused
        // - Not paused: {session, threadId} - NO frameId
        // - Paused: {session, threadId, frameId} - HAS frameId
        vscode.debug.onDidChangeActiveStackItem(async (stackItem) => {
            console.log(`[DEBUG] Stack item changed: ${stackItem ? JSON.stringify(stackItem) : 'null'}`);
            
            if (stackItem) {
                // Check if frameId exists - this is the reliable indicator of being paused
                const hasFrameId = 'frameId' in stackItem && (stackItem as any).frameId !== undefined;
                
                console.log(`[DEBUG] Stack item has frameId: ${hasFrameId}`);
                
                if (hasFrameId) {
                    // Has frameId = actually paused at a specific stack frame
                    this.isPaused = true;
                    console.log('📍 Stack item has frameId - isPaused set to TRUE');
                    
                    // Extract frame info
                    this.pausedThreadId = (stackItem as any).threadId;
                    this.pausedFrameId = (stackItem as any).frameId;
                    console.log(`[DEBUG] Captured threadId: ${this.pausedThreadId}, frameId: ${this.pausedFrameId}`);
                    
                    // Fetch full frame details
                    const session = vscode.debug.activeDebugSession;
                    if (session) {
                        await this.captureFrameDetails(session, stackItem as any);
                    }
                } else {
                    // Has threadId but NO frameId = connected but not paused (running)
                    this.isPaused = false;
                    this.isInEventLoop = false;
                    console.log('📍 Stack item has NO frameId - isPaused set to FALSE (running)');
                    
                    // Still capture threadId for reference
                    if ('threadId' in stackItem) {
                        this.pausedThreadId = (stackItem as any).threadId;
                    }
                }
            } else {
                // Stack item cleared = no debug context
                console.log('📍 Stack item cleared - isPaused set to FALSE');
                this.isPaused = false;
                this.isInEventLoop = false;
                
                // Clear all paused frame info
                this.clearPausedFrameInfo();
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
                        if (bps.length === 0) {
                            this.breakpoints.delete(file);
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

            // Update thread tracking
            for (const thread of threadsResponse.threads) {
                this.threads.set(thread.id, {
                    id: thread.id,
                    name: thread.name,
                    stopped: thread.stopped === true
                });
                
                // Track main thread
                if (!this.mainThreadId && thread.name?.toLowerCase().includes('main')) {
                    this.mainThreadId = thread.id;
                }
            }

            // Find stopped thread (prefer main thread if stopped)
            let targetThread = null;
            if (this.mainThreadId) {
                const mainThread = this.threads.get(this.mainThreadId);
                if (mainThread?.stopped) {
                    targetThread = mainThread;
                }
            }
            
            // If main thread not stopped, find any stopped thread
            if (!targetThread) {
                targetThread = Array.from(this.threads.values()).find(t => t.stopped);
            }

            if (!targetThread) {
                // No stopped threads
                this.isPaused = false;
                console.log('⚠️ No stopped threads - isPaused = FALSE');
                return;
            }

            // Get stack trace for the stopped thread
            const stackResponse = await session.customRequest('stackTrace', {
                threadId: targetThread.id,
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

                console.log(`Position updated: ${this.currentFunction} at ${this.currentFile}:${this.currentLine}`);
                
                // Check if we're in event loop
                await this.checkIfInEventLoop(session, targetThread.id);
            }
        } catch (error) {
            console.error('Error updating current position:', error);
        }
    }

    /**
     * Check if we're paused in an event loop using DAP evaluate
     */
    private async checkIfInEventLoop(session: vscode.DebugSession, threadId: number): Promise<void> {
        // Only check for Python debugpy
        if (session.configuration.type !== 'debugpy' && session.configuration.type !== 'python') {
            this.isInEventLoop = false;
            return;
        }

        try {
            // Try to evaluate asyncio state
            const evalResponse = await session.customRequest('evaluate', {
                expression: 'import asyncio; loop = asyncio.get_running_loop(); (loop.get_debug(), len(asyncio.all_tasks(loop)))',
                frameId: this.stackFrames[0]?.id,
                context: 'repl'
            });

            if (evalResponse && evalResponse.result) {
                // Parse the tuple result: (debug_enabled, task_count)
                const match = evalResponse.result.match(/\((\w+),\s*(\d+)\)/);
                if (match) {
                    const debugEnabled = match[1] === 'True';
                    const taskCount = parseInt(match[2], 10);
                    
                    // Check if we're near a breakpoint
                    const nearBreakpoint = this.isNearBreakpoint();
                    
                    // We're in event loop if:
                    // - Multiple tasks running (>1)
                    // - Not near a user breakpoint
                    // - In framework/asyncio code
                    this.isInEventLoop = taskCount > 1 && !nearBreakpoint && this.isFrameworkCode();
                    
                    if (this.isInEventLoop) {
                        console.log(`⚠️ IN EVENT LOOP: ${taskCount} tasks, debug=${debugEnabled}, nearBP=${nearBreakpoint}`);
                        console.log(`   Setting isPaused = FALSE (event loop waiting state)`);
                        this.isPaused = false;
                    } else {
                        console.log(`✅ VALID PAUSE: tasks=${taskCount}, nearBP=${nearBreakpoint}`);
                        // Keep isPaused = true (already set by stopped event)
                    }
                }
            }
        } catch (error) {
            // asyncio not available or not in async context - not in event loop
            this.isInEventLoop = false;
            // Keep isPaused = true (already set by stopped event)
            console.log('✅ Not in async context - valid pause state');
        }
    }

    /**
     * Check if current position is near a user breakpoint (within 5 lines)
     */
    private isNearBreakpoint(): boolean {
        if (!this.currentFile || !this.currentLine) {
            return false;
        }

        const breakpointsInFile = this.breakpoints.get(this.currentFile) || [];
        return breakpointsInFile.some(bp => {
            if (bp instanceof vscode.SourceBreakpoint) {
                const bpLine = bp.location.range.start.line + 1; // 0-indexed to 1-indexed
                return Math.abs(this.currentLine! - bpLine) <= 5;
            }
            return false;
        });
    }

    /**
     * Check if current position is in framework/library code
     */
    private isFrameworkCode(): boolean {
        if (!this.currentFile && !this.currentFunction) {
            return false;
        }

        // Framework/library paths
        const frameworkPaths = [
            '/uvicorn/', '/starlette/', '/fastapi/',
            '/flask/', '/django/', '/tornado/',
            '/asyncio/', '/selectors/', '/socket',
            'site-packages/', 'dist-packages/',
            'node_modules/', '/express/', '/koa/'
        ];

        const isFrameworkPath = frameworkPaths.some(path =>
            this.currentFile?.toLowerCase().includes(path)
        );

        // Event loop function names
        const eventLoopFunctions = [
            'run', '_run', 'serve', '_serve', 'listen', '_listen',
            'loop', 'event_loop', 'run_forever', 'run_until_complete',
            'select', 'poll', 'epoll', 'kqueue',
            'wait', '_wait', 'wait_for', '__aexit__', '__aenter__'
        ];

        const isEventLoopFunction = eventLoopFunctions.some(fn => 
            this.currentFunction?.toLowerCase().includes(fn)
        );

        return isFrameworkPath || isEventLoopFunction;
    }

    /**
     * Capture frame details from active stack item
     */
    private async captureFrameDetails(session: vscode.DebugSession, stackItem: any): Promise<void> {
        try {
            const threadId = stackItem.threadId;
            console.log(`[DEBUG] Capturing frame details for thread ${threadId}`);
            
            const response = await session.customRequest('stackTrace', {
                threadId: threadId,
                startFrame: 0,
                levels: 20
            });
            
            if (response?.stackFrames?.length > 0) {
                const frame = response.stackFrames[0];
                this.pausedThreadId = threadId;
                this.pausedFrameId = frame.id;
                this.pausedLine = frame.line;
                this.pausedFunction = frame.name;
                this.pausedFile = frame.source?.path;
                
                // Also update current* properties for backward compatibility
                this.currentLine = frame.line;
                this.currentFunction = frame.name;
                this.currentFile = frame.source?.path;
                this.stackFrames = response.stackFrames;
                
                console.log(`[DEBUG] Frame captured: ${this.pausedFunction} at ${this.pausedFile}:${this.pausedLine}`);
                console.log(`[DEBUG] ThreadId: ${this.pausedThreadId}, FrameId: ${this.pausedFrameId}`);
                
                // Check if we're in event loop
                await this.checkIfInEventLoop(session, threadId);
            }
        } catch (error) {
            console.error('[DEBUG] Error capturing frame details:', error);
        }
    }

    /**
     * Verify that we're actually paused by checking thread state
     * This is needed because activeStackItem can persist even when running
     */
    private async verifyPausedState(session: vscode.DebugSession): Promise<boolean> {
        try {
            // Get threads and check if any are stopped
            const threadsResponse = await session.customRequest('threads');
            
            if (threadsResponse?.threads) {
                for (const thread of threadsResponse.threads) {
                    // Try to get stack trace for this thread
                    try {
                        const stackResponse = await session.customRequest('stackTrace', {
                            threadId: thread.id,
                            startFrame: 0,
                            levels: 1
                        });
                        
                        // If we can get a stack frame, thread is paused
                        if (stackResponse?.stackFrames?.length > 0) {
                            console.log(`[DEBUG] verifyPausedState: Thread ${thread.id} has stack frames - PAUSED`);
                            return true;
                        }
                    } catch (stackError: any) {
                        // Stack trace failed - thread might be running
                        // This is expected for running threads
                        console.log(`[DEBUG] verifyPausedState: Thread ${thread.id} stack error: ${stackError.message}`);
                    }
                }
            }
            
            console.log(`[DEBUG] verifyPausedState: No paused threads found - NOT PAUSED`);
            return false;
        } catch (error) {
            console.error('[DEBUG] verifyPausedState error:', error);
            // On error, assume paused (safer for debugging)
            return true;
        }
    }

    /**
     * Clear paused frame info when debugger resumes
     */
    private clearPausedFrameInfo(): void {
        console.log(`[DEBUG] Clearing paused frame info`);
        this.pausedThreadId = null;
        this.pausedFrameId = null;
        this.pausedLine = null;
        this.pausedFunction = null;
        this.pausedFile = null;
    }

    /**
     * Get stored paused thread ID (for getVariables, getStackTrace)
     */
    getPausedThreadId(): number | null {
        return this.pausedThreadId;
    }

    /**
     * Get stored paused frame ID (for evaluate)
     */
    getPausedFrameId(): number | null {
        return this.pausedFrameId;
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
        this.isInEventLoop = false;
        this.stackFrames = [];
        this.threads.clear();
        this.mainThreadId = null;
        this.clearPausedFrameInfo();
    }

    /**
     * Manually refresh frame info when paused (NOT for setting isPaused state)
     * isPaused is ONLY controlled by stopped/continued DAP events
     */
    async refreshPausedState(): Promise<void> {
        console.log(`[DEBUG] refreshPausedState() called - current isPaused: ${this.isPaused}`);
        
        // DO NOT use activeStackItem to set isPaused - it's unreliable
        // isPaused is ONLY controlled by stopped/continued events
        
        const session = this.getActiveSession();
        if (!session) {
            console.log(`[DEBUG] No active session`);
            return;
        }

        // If we think we're paused, try to refresh the position info
        if (this.isPaused) {
            try {
                const threadsResponse = await session.customRequest('threads');
                console.log(`[DEBUG] Threads response:`, JSON.stringify(threadsResponse, null, 2));
                
                if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                    // Update all thread states
                    for (const thread of threadsResponse.threads) {
                        console.log(`[DEBUG] Thread ${thread.id} (${thread.name}): stopped=${thread.stopped}`);
                        this.threads.set(thread.id, {
                            id: thread.id,
                            name: thread.name,
                            stopped: thread.stopped === true
                        });
                    }

                    // Try to get stack trace to update position info
                    const stoppedThread = Array.from(this.threads.values()).find(t => t.stopped);
                    if (stoppedThread) {
                        try {
                            const stackResponse = await session.customRequest('stackTrace', {
                                threadId: stoppedThread.id,
                                startFrame: 0,
                                levels: 20
                            });
                            
                            if (stackResponse?.stackFrames?.length > 0) {
                                // Update position info
                                const topFrame = stackResponse.stackFrames[0];
                                this.stackFrames = stackResponse.stackFrames;
                                this.currentLine = topFrame.line;
                                this.currentFunction = topFrame.name;
                                if (topFrame.source && topFrame.source.path) {
                                    this.currentFile = topFrame.source.path;
                                }
                                console.log(`🔄 Refreshed position: ${this.currentFunction} at ${this.currentFile}:${this.currentLine}`);
                            }
                        } catch (stackError) {
                            console.log('⚠️ Error getting stack trace:', stackError);
                        }
                    }
                }
            } catch (error) {
                console.error('[DEBUG] Error refreshing frame info:', error);
            }
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
