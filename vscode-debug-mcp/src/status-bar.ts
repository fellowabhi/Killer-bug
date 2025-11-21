import * as vscode from 'vscode';
import { debugState } from './debug-state';

/**
 * Status bar manager - shows current debug state
 */
export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    private updateInterval: NodeJS.Timeout | null = null;

    private constructor() {
        // Create status bar item on the left side
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        
        this.statusBarItem.command = 'aiDebugger.showOutput';
        this.statusBarItem.tooltip = 'AI Debugger Status - Click to show output';
        
        // Start with default state
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Update every 500ms to keep status current
        this.updateInterval = setInterval(() => {
            this.updateStatusBar();
        }, 500);
    }

    static getInstance(): StatusBarManager {
        if (!StatusBarManager.instance) {
            StatusBarManager.instance = new StatusBarManager();
        }
        return StatusBarManager.instance;
    }

    /**
     * Update status bar based on current debug state
     */
    private updateStatusBar() {
        if (!debugState.isActive()) {
            // No active session
            this.statusBarItem.text = '$(debug-disconnect) AI Debug: Ready';
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.tooltip = 'AI Debugger - No active session\nClick to show output';
        } else if (debugState.isPaused && !debugState.isInEventLoop) {
            // Paused at breakpoint (but NOT in event loop)
            const location = debugState.currentLine 
                ? `line ${debugState.currentLine}`
                : 'breakpoint';
            const func = debugState.currentFunction || 'unknown';
            
            this.statusBarItem.text = `$(debug-pause) AI Debug: Paused at ${location}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.tooltip = `AI Debugger - Paused\nFunction: ${func}\nLine: ${debugState.currentLine || 'unknown'}\nClick to show output`;
        } else {
            // Running (or in event loop)
            const statusText = debugState.isInEventLoop 
                ? 'Running (event loop)'
                : 'Running';
            
            this.statusBarItem.text = `$(debug-alt) AI Debug: ${statusText}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            this.statusBarItem.tooltip = debugState.isInEventLoop
                ? 'AI Debugger - Running in event loop\nWaiting for requests\nClick to show output'
                : 'AI Debugger - Running\nClick to show output';
        }
    }

    /**
     * Show success message briefly
     */
    showSuccess(message: string) {
        const originalText = this.statusBarItem.text;
        const originalBg = this.statusBarItem.backgroundColor;
        
        this.statusBarItem.text = `$(check) ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        
        setTimeout(() => {
            this.updateStatusBar();
        }, 3000);
    }

    /**
     * Show error message briefly
     */
    showError(message: string) {
        const originalText = this.statusBarItem.text;
        const originalBg = this.statusBarItem.backgroundColor;
        
        this.statusBarItem.text = `$(error) ${message}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        
        setTimeout(() => {
            this.updateStatusBar();
        }, 3000);
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.statusBarItem.dispose();
    }
}

// Export singleton
export const statusBarManager = StatusBarManager.getInstance();
