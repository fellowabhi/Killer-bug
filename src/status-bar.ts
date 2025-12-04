/*
 * Killer Bug AI Debugger
 * Copyright (C) 2025 Abhishek (fellowabhi)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as vscode from 'vscode';
import { debugState } from './debug-state';

/**
 * Status bar manager - shows current debug state
 */
export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    private updateInterval: NodeJS.Timeout | null = null;
    private customStatusActive: boolean = false; // Flag to prevent auto-update from overriding

    private constructor() {
        // Create status bar item on the left side
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        
        this.statusBarItem.command = 'killerBug.showOutput';
        this.statusBarItem.tooltip = 'Killer Bug AI Debugger - Click to show output';
        
        // Start with default state
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Update every 500ms to keep status current
        this.updateInterval = setInterval(() => {
            // Only update if no custom status is active
            if (!this.customStatusActive) {
                this.updateStatusBar();
            }
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
            // No active session - but don't update if custom status is active
            // (let custom status methods handle idle/start states)
            if (!this.customStatusActive) {
                this.statusBarItem.text = '$(debug-disconnect) Killer Bug: Idle';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.command = 'killerBug.showOutput';
                this.statusBarItem.tooltip = 'Killer Bug AI Debugger - Idle\nClick to show output';
            }
        } else if (debugState.isPaused && !debugState.isInEventLoop) {
            // Paused at breakpoint (but NOT in event loop)
            const location = debugState.currentLine 
                ? `line ${debugState.currentLine}`
                : 'breakpoint';
            const func = debugState.currentFunction || 'unknown';
            
            this.statusBarItem.text = `$(debug-pause) Killer Bug: Paused at ${location}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.command = 'killerBug.showOutput';
            this.statusBarItem.tooltip = `Killer Bug AI Debugger - Paused\nFunction: ${func}\nLine: ${debugState.currentLine || 'unknown'}\nClick to show output`;
            this.customStatusActive = false;
        } else {
            // Running (or in event loop)
            const statusText = debugState.isInEventLoop 
                ? 'Running (event loop)'
                : 'Running';
            
            this.statusBarItem.text = `$(debug-alt) Killer Bug: ${statusText}`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            this.statusBarItem.command = 'killerBug.showOutput';
            this.statusBarItem.tooltip = debugState.isInEventLoop
                ? 'Killer Bug AI Debugger - Running in event loop\nWaiting for requests\nClick to show output'
                : 'Killer Bug AI Debugger - Running\nClick to show output';
            this.customStatusActive = false;
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
        this.customStatusActive = true;
        
        setTimeout(() => {
            this.customStatusActive = false;
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
        this.customStatusActive = true;
        
        setTimeout(() => {
            this.customStatusActive = false;
            this.updateStatusBar();
        }, 3000);
    }

    /**
     * Show configuration status (disabled due to missing config)
     */
    showConfigurationDisabled() {
        this.statusBarItem.text = '$(circle-slash) Killer Bug: Configuration Required';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.tooltip = 'Killer Bug AI Debugger - Configuration required\nRun "Killer Bug: Configure AI Debugger" command\nClick to show output';
        this.customStatusActive = true;
    }

    /**
     * Show running with port info
     */
    showRunning(port: number) {
        this.statusBarItem.text = `$(debug-alt) Killer Bug: Running (Click to Stop)`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        this.statusBarItem.command = 'killerBug.start';
        this.statusBarItem.tooltip = `Killer Bug AI Debugger - Running on port ${port}\nClick to STOP the MCP server`;
        this.customStatusActive = true;
    }

    /**
     * Show simple ready state (silent, no warnings) - used for initial activation
     */
    showReady() {
        this.statusBarItem.text = `$(debug-disconnect) Killer Bug: Ready`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = 'killerBug.start';
        this.statusBarItem.tooltip = `Killer Bug AI Debugger\nClick to start debugging`;
        this.customStatusActive = true;
    }

    /**
     * Show configured but not running
     */
    showConfiguredNotRunning(port: number) {
        this.statusBarItem.text = `$(debug-disconnect) Killer Bug: Ready (Click to Start)`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = 'killerBug.start';
        this.statusBarItem.tooltip = `Killer Bug AI Debugger - Configured on port ${port}\nClick to START the MCP server`;
        this.customStatusActive = true;
    }

    /**
     * Show not configured - ready for setup
     */
    showNotConfigured() {
        this.statusBarItem.text = `$(circle-slash) Killer Bug: Click to Configure`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.command = 'killerBug.start';
        this.statusBarItem.tooltip = `Killer Bug AI Debugger - Not configured\nClick to configure and start`;
        this.customStatusActive = true;
    }

    /**
     * Show extension ready (no workspace open)
     */
    showExtensionReady() {
        this.statusBarItem.text = `$(debug-disconnect) Killer Bug: Ready`;
        this.statusBarItem.backgroundColor = undefined;
        this.statusBarItem.command = 'killerBug.showOutput';
        this.statusBarItem.tooltip = `Killer Bug AI Debugger - Open a project folder to get started`;
        this.customStatusActive = false;
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
