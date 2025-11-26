import * as fs from 'fs';
import * as path from 'path';

/**
 * Project-level MCP Config Manager
 * Handles .vscode/mcp.json (VS Code) and .cursor/mcp.json (Cursor) per project
 */
export class ProjectMCPConfigManager {
    private projectRoot: string;
    private ideType: 'vscode' | 'cursor';
    private configPath: string;
    private projectName: string;

    constructor(projectRoot: string, ideType: 'vscode' | 'cursor' = 'vscode') {
        this.projectRoot = projectRoot;
        this.ideType = ideType;
        this.projectName = path.basename(projectRoot);
        this.configPath = this.getConfigPath();
    }

    /**
     * Get the correct config file path based on IDE type
     */
    private getConfigPath(): string {
        if (this.ideType === 'cursor') {
            return path.join(this.projectRoot, '.cursor', 'mcp.json');
        } else {
            return path.join(this.projectRoot, '.vscode', 'mcp.json');
        }
    }

    /**
     * Get the server name based on project name
     * Format: killer-bug-<project-name>
     */
    private getServerName(): string {
        // Replace spaces and special chars with hyphens, convert to lowercase
        const sanitized = this.projectName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        return `killer-bug-${sanitized}`;
    }

    /**
     * Ensure config directory exists
     */
    private ensureConfigDir(): void {
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            console.log(`[Project MCP Config] Creating directory: ${configDir}`);
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    /**
     * Read current MCP configuration
     */
    private readConfig(): any {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.log(`[Project MCP Config] Config file does not exist: ${this.configPath}`);
                return {};
            }

            const content = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(content);
            console.log(`[Project MCP Config] Loaded config from: ${this.configPath}`);
            return config;
        } catch (error) {
            console.error(`[Project MCP Config] Error reading config: ${error}`);
            return {};
        }
    }

    /**
     * Write MCP configuration
     */
    private writeConfig(config: any): boolean {
        try {
            // Ensure directory exists
            this.ensureConfigDir();

            // Write with formatting
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            console.log(`[Project MCP Config] Config written to: ${this.configPath}`);
            return true;
        } catch (error) {
            console.error(`[Project MCP Config] Error writing config: ${error}`);
            return false;
        }
    }

    /**
     * Configure project-level MCP server
     */
    async configureProject(port: number = 3100): Promise<{ success: boolean; message: string; configPath: string; serverName: string; port: number }> {
        console.log(`[Project MCP Config] Configuring ${this.ideType} MCP server for project: ${this.projectName} on port ${port}`);

        try {
            // Read existing config
            let config = this.readConfig();

            // Determine the correct key based on IDE
            // VS Code uses "servers", Cursor uses "mcpServers"
            const serverKey = this.ideType === 'cursor' ? 'mcpServers' : 'servers';

            // Initialize servers object if not exists
            if (!config[serverKey]) {
                config[serverKey] = {};
                console.log(`[Project MCP Config] Created ${serverKey} object`);
            }

            const serverName = this.getServerName();

            // Define AI Debug server config for HTTP transport
            const aiDebugServerConfig = {
                type: 'http',
                url: `http://localhost:${port}/mcp`,
                env: {
                    MCP_PORT: port.toString()
                }
            };

            // Check if already configured
            const existingConfig = config[serverKey][serverName];
            if (existingConfig) {
                console.log(`[Project MCP Config] Server "${serverName}" already configured`);

                // Check if port is the same
                if (existingConfig.env?.MCP_PORT == port) {
                    return {
                        success: true,
                        message: `✅ AI Debug MCP server "${serverName}" already configured on port ${port} in ${this.ideType}.\n\nNo changes needed.`,
                        configPath: this.configPath,
                        serverName: serverName,
                        port: port
                    };
                } else {
                    // Update port
                    console.log(`[Project MCP Config] Updating port from ${existingConfig.env?.MCP_PORT} to ${port}`);
                    config[serverKey][serverName] = aiDebugServerConfig;
                }
            } else {
                // Add new server
                console.log(`[Project MCP Config] Adding AI Debug server configuration`);
                config[serverKey][serverName] = aiDebugServerConfig;
            }

            // Write config
            const success = this.writeConfig(config);

            if (success) {
                return {
                    success: true,
                    message: `✅ Project MCP configured successfully!\n\n` +
                            `IDE: ${this.ideType}\n` +
                            `Project: ${this.projectName}\n` +
                            `Server: ${serverName}\n` +
                            `Port: ${port}\n` +
                            `Config: ${this.configPath}\n\n` +
                            `Your AI assistant can now use the AI Debugger MCP tools for this project.`,
                    configPath: this.configPath,
                    serverName: serverName,
                    port: port
                };
            } else {
                return {
                    success: false,
                    message: `❌ Failed to write MCP configuration to project.\n\n` +
                            `Please check file permissions for:\n${this.configPath}`,
                    configPath: this.configPath,
                    serverName: serverName,
                    port: port
                };
            }
        } catch (error: any) {
            console.error('[Project MCP Config] Error during configuration:', error);
            return {
                success: false,
                message: `❌ Error configuring project MCP: ${error.message}\n\n` +
                        `Please check the Extension Host output for details.`,
                configPath: this.configPath,
                serverName: this.getServerName(),
                port: port
            };
        }
    }

    /**
     * Get current configuration status
     */
    getStatus(): { configured: boolean; port?: number; serverName?: string; configPath: string } {
        try {
            const config = this.readConfig();

            // Check both VS Code (servers) and Cursor (mcpServers) keys
            const serverKey = this.ideType === 'cursor' ? 'mcpServers' : 'servers';
            const serverName = this.getServerName();
            const serverConfig = config[serverKey]?.[serverName];

            if (serverConfig) {
                const port = serverConfig.env?.MCP_PORT || 3100;
                return {
                    configured: true,
                    port: parseInt(port),
                    serverName: serverName,
                    configPath: this.configPath
                };
            }

            return {
                configured: false,
                configPath: this.configPath
            };
        } catch (error) {
            console.error('[Project MCP Config] Error getting status:', error);
            return {
                configured: false,
                configPath: this.configPath
            };
        }
    }

    /**
     * Get project name
     */
    getProjectName(): string {
        return this.projectName;
    }

    /**
     * Get IDE type
     */
    getIDEType(): string {
        return this.ideType;
    }
}
