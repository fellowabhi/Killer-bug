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

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * MCP Config Manager - handles VS Code and Cursor MCP configuration
 */
export class MCPConfigManager {
    private configPath: string;
    private ideType: 'vscode' | 'cursor';

    constructor(port: number = 3100, ideType: 'vscode' | 'cursor' = 'vscode') {
        this.ideType = ideType;
        this.configPath = this.getMCPConfigPath();
    }

    /**
     * Get the correct MCP config path based on OS and IDE
     */
    private getMCPConfigPath(): string {
        const homeDir = os.homedir();
        
        if (this.ideType === 'cursor') {
            // Cursor IDE paths
            if (process.platform === 'win32') {
                // Windows: %APPDATA%\Cursor\User\mcp.json
                const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
                return path.join(appData, 'Cursor', 'User', 'mcp.json');
            } else if (process.platform === 'darwin') {
                // macOS: ~/Library/Application Support/Cursor/User/mcp.json
                return path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'mcp.json');
            } else {
                // Linux: ~/.cursor/mcp.json
                return path.join(homeDir, '.cursor', 'mcp.json');
            }
        } else {
            // VS Code paths (default)
            if (process.platform === 'win32') {
                // Windows: %APPDATA%\Code\User\mcp.json
                const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
                return path.join(appData, 'Code', 'User', 'mcp.json');
            } else if (process.platform === 'darwin') {
                // macOS: ~/Library/Application Support/Code/User/mcp.json
                return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
            } else {
                // Linux: ~/.config/Code/User/mcp.json
                return path.join(homeDir, '.config', 'Code', 'User', 'mcp.json');
            }
        }
    }

    /**
     * Read current MCP configuration
     */
    private readConfig(): any {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log(`[MCP Config] Config file does not exist: ${this.configPath}`);
                return {};
            }

            const content = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(content);
            console.log(`[MCP Config] Loaded config from: ${this.configPath}`);
            return config;
        } catch (error) {
            console.error(`[MCP Config] Error reading config: ${error}`);
            return {};
        }
    }

    /**
     * Write MCP configuration
     */
    private writeConfig(config: any): boolean {
        try {
            // Ensure directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                console.log(`[MCP Config] Creating directory: ${configDir}`);
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Write with formatting
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            console.log(`[MCP Config] Config written to: ${this.configPath}`);
            return true;
        } catch (error) {
            console.error(`[MCP Config] Error writing config: ${error}`);
            return false;
        }
    }

    /**
     * Configure VS Code MCP server
     * Adds or updates AI Debug MCP server in VS Code config
     */
    async configureVSCode(port: number = 3100): Promise<{ success: boolean; message: string; configPath: string }> {
        this.ideType = 'vscode';
        this.configPath = this.getMCPConfigPath();
        return this.configure(port, 'VS Code');
    }

    /**
     * Configure Cursor IDE MCP server
     * Adds or updates AI Debug MCP server in Cursor config
     */
    async configureCursor(port: number = 3100): Promise<{ success: boolean; message: string; configPath: string }> {
        this.ideType = 'cursor';
        this.configPath = this.getMCPConfigPath();
        return this.configure(port, 'Cursor');
    }

    /**
     * Internal method to configure MCP for the specified IDE
     */
    private async configure(port: number, ideName: string): Promise<{ success: boolean; message: string; configPath: string }> {
        console.log(`[MCP Config] Configuring ${ideName} MCP server on port ${port}`);

        try {
            // Read existing config
            let config = this.readConfig();
            
            // Determine the correct key based on IDE
            // VS Code uses "servers", Cursor uses "mcpServers"
            const serverKey = this.ideType === 'cursor' ? 'mcpServers' : 'servers';
            
            // Initialize servers object if not exists
            if (!config[serverKey]) {
                config[serverKey] = {};
                console.log(`[MCP Config] Created ${serverKey} object`);
            }

            // Define AI Debug server config for HTTP transport
            const aiDebugServerConfig = {
                type: 'http',
                url: `http://localhost:${port}/mcp`,
                env: {
                    MCP_PORT: port.toString()
                }
            };

            // Check if already configured
            const existingConfig = config[serverKey]['ai-debug'];
            if (existingConfig) {
                console.log('[MCP Config] AI Debug server already configured');
                
                // Check if port is the same
                if (existingConfig.env?.MCP_PORT == port) {
                    return {
                        success: true,
                        message: `✅ AI Debug MCP server already configured on port ${port} in ${ideName}. No changes needed.`,
                        configPath: this.configPath
                    };
                } else {
                    // Update port
                    console.log(`[MCP Config] Updating port from ${existingConfig.env?.MCP_PORT} to ${port}`);
                    config[serverKey]['ai-debug'] = aiDebugServerConfig;
                }
            } else {
                // Add new server
                console.log('[MCP Config] Adding AI Debug server configuration');
                config[serverKey]['ai-debug'] = aiDebugServerConfig;
            }

            // Write config
            const success = this.writeConfig(config);
            
            if (success) {
                return {
                    success: true,
                    message: `✅ ${ideName} MCP configured successfully!\n\n` +
                            `IDE: ${ideName}\n` +
                            `Server: ai-debug\n` +
                            `Port: ${port}\n` +
                            `Config: ${this.configPath}\n\n` +
                            `Your AI assistant can now use the AI Debugger MCP tools.`,
                    configPath: this.configPath
                };
            } else {
                return {
                    success: false,
                    message: `❌ Failed to write MCP configuration to ${ideName}.\n\n` +
                            `Please check file permissions for:\n${this.configPath}`,
                    configPath: this.configPath
                };
            }
        } catch (error: any) {
            console.error('[MCP Config] Error during configuration:', error);
            return {
                success: false,
                message: `❌ Error configuring ${ideName} MCP: ${error.message}\n\n` +
                        `Please check the Extension Host output for details.`,
                configPath: this.configPath
            };
        }
    }

    /**
     * Get current configuration status
     */
    getStatus(): { configured: boolean; port?: number; configPath: string } {
        try {
            const config = this.readConfig();
            
            // Check both VS Code (servers) and Cursor (mcpServers) keys
            const serverKey = this.ideType === 'cursor' ? 'mcpServers' : 'servers';
            const serverConfig = config[serverKey]?.['ai-debug'];
            
            if (serverConfig) {
                const port = serverConfig.env?.MCP_PORT || 3100;
                return {
                    configured: true,
                    port: parseInt(port),
                    configPath: this.configPath
                };
            }

            return {
                configured: false,
                configPath: this.configPath
            };
        } catch (error) {
            console.error('[MCP Config] Error getting status:', error);
            return {
                configured: false,
                configPath: this.configPath
            };
        }
    }

    /**
     * Get config file path (for UI display)
     */
    getConfigPath(): string {
        return this.configPath;
    }

    /**
     * Get OS-specific description
     */
    getOSDescription(): string {
        if (process.platform === 'win32') {
            return 'Windows (AppData)';
        } else if (process.platform === 'darwin') {
            return 'macOS (Library)';
        } else {
            return 'Linux (~/.config or ~/.cursor)';
        }
    }

    /**
     * Get IDE name
     */
    getIDEName(): string {
        return this.ideType === 'cursor' ? 'Cursor' : 'VS Code';
    }
}

// Export singleton
export const mcpConfigManager = new MCPConfigManager();
