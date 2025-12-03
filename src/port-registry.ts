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
 * Port Registry - tracks which ports are in use by which projects
 * across multiple IDE instances using a lock file
 */
export class PortRegistry {
    private static registryPath = path.join(os.homedir(), '.killer-bug-ports.json');

    /**
     * Port entry in registry
     */
    private static registryEntry = {
        port: 0,
        projectPath: '',
        projectName: '',
        timestamp: 0,
        pidOrInstanceId: ''
    };

    /**
     * Initialize registry if it doesn't exist
     */
    private static ensureRegistry(): void {
        if (!fs.existsSync(this.registryPath)) {
            fs.writeFileSync(this.registryPath, JSON.stringify({}, null, 2), 'utf-8');
            console.log(`[Port Registry] Created new registry at ${this.registryPath}`);
        }
    }

    /**
     * Read the port registry
     */
    private static readRegistry(): Record<string, any> {
        try {
            this.ensureRegistry();
            const content = fs.readFileSync(this.registryPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.error('[Port Registry] Error reading registry:', error);
            return {};
        }
    }

    /**
     * Write the port registry
     */
    private static writeRegistry(registry: Record<string, any>): void {
        try {
            fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2), 'utf-8');
        } catch (error) {
            console.error('[Port Registry] Error writing registry:', error);
        }
    }

    /**
     * Check if port is already registered for another project
     */
    static isPortRegistered(port: number, excludeProjectPath?: string): boolean {
        const registry = this.readRegistry();
        
        for (const [portStr, entry] of Object.entries(registry)) {
            if (parseInt(portStr) === port) {
                // If this is the same project, it's not a conflict
                if (excludeProjectPath && entry.projectPath === excludeProjectPath) {
                    return false;
                }
                // Port is used by another project
                return true;
            }
        }
        
        return false;
    }

    /**
     * Get the project using a specific port
     */
    static getProjectForPort(port: number): { projectName: string; projectPath: string } | null {
        const registry = this.readRegistry();
        const entry = registry[port.toString()];
        
        if (entry) {
            return {
                projectName: entry.projectName,
                projectPath: entry.projectPath
            };
        }
        
        return null;
    }

    /**
     * Register a port for a project
     */
    static registerPort(port: number, projectPath: string, projectName: string): void {
        const registry = this.readRegistry();
        
        registry[port.toString()] = {
            port,
            projectPath,
            projectName,
            timestamp: Date.now(),
            pidOrInstanceId: `${process.pid}-${Date.now()}`
        };
        
        this.writeRegistry(registry);
        console.log(`[Port Registry] Registered port ${port} for project: ${projectName}`);
    }

    /**
     * Unregister a port
     */
    static unregisterPort(port: number): void {
        const registry = this.readRegistry();
        
        if (registry[port.toString()]) {
            delete registry[port.toString()];
            this.writeRegistry(registry);
            console.log(`[Port Registry] Unregistered port ${port}`);
        }
    }

    /**
     * Get all registered ports
     */
    static getAllRegisteredPorts(): Array<{ port: number; projectName: string; projectPath: string }> {
        const registry = this.readRegistry();
        const ports: Array<{ port: number; projectName: string; projectPath: string }> = [];
        
        for (const [portStr, entry] of Object.entries(registry)) {
            ports.push({
                port: parseInt(portStr),
                projectName: entry.projectName,
                projectPath: entry.projectPath
            });
        }
        
        return ports;
    }

    /**
     * Clean up stale entries (older than 1 hour)
     */
    static cleanupStaleEntries(): void {
        const registry = this.readRegistry();
        const now = Date.now();
        const oneHourMs = 60 * 60 * 1000;
        let updated = false;

        for (const [portStr, entry] of Object.entries(registry)) {
            const age = now - entry.timestamp;
            if (age > oneHourMs) {
                console.log(`[Port Registry] Removing stale entry for port ${portStr}`);
                delete registry[portStr];
                updated = true;
            }
        }

        if (updated) {
            this.writeRegistry(registry);
        }
    }

    /**
     * Find next available port, considering both system ports and registry
     */
    static async findAvailablePort(startPort: number = 3100): Promise<number> {
        const { PortManager } = await import('./port-manager');
        
        let port = startPort;
        const maxAttempts = 100;

        for (let i = 0; i < maxAttempts; i++) {
            const systemInUse = await PortManager.isPortInUse(port);
            const registryInUse = this.isPortRegistered(port);

            if (!systemInUse && !registryInUse) {
                console.log(`[Port Registry] Found available port: ${port}`);
                return port;
            }

            if (systemInUse || registryInUse) {
                console.log(`[Port Registry] Port ${port}: system=${systemInUse}, registry=${registryInUse}`);
            }

            port++;
        }

        throw new Error(`Could not find available port after ${maxAttempts} attempts`);
    }

    /**
     * Get suggested ports considering both system and registry
     * Tries to suggest AVAILABLE ports first, then shows in-use ones as alternatives
     */
    static async getSuggestedPorts(startPort: number = 3100, count: number = 3): Promise<Array<{ port: number; available: boolean; conflictProject?: string }>> {
        const { PortManager } = await import('./port-manager');
        const suggestions: Array<{ port: number; available: boolean; conflictProject?: string }> = [];
        const available: Array<{ port: number; available: boolean; conflictProject?: string }> = [];
        const inUse: Array<{ port: number; available: boolean; conflictProject?: string }> = [];

        // Check ports starting from startPort, collect available and in-use
        let port = startPort;
        const maxCheck = 20; // Check up to 20 ports to find available ones

        for (let i = 0; i < maxCheck; i++) {
            const systemInUse = await PortManager.isPortInUse(port);
            const projectForPort = this.getProjectForPort(port);
            
            const suggestion = {
                port,
                available: !systemInUse && !projectForPort,
                conflictProject: projectForPort?.projectName
            };

            if (suggestion.available) {
                available.push(suggestion);
            } else {
                inUse.push(suggestion);
            }

            if (available.length >= count) {
                break; // We have enough available ports
            }

            port++;
        }

        // Return: first all available ports, then in-use as alternatives
        suggestions.push(...available.slice(0, count));
        
        // If we don't have enough available ports, fill with in-use ones
        if (suggestions.length < count) {
            suggestions.push(...inUse.slice(0, count - suggestions.length));
        }

        // Log for debugging
        console.log(`[Port Registry] Suggested ports: ${suggestions.map(s => `${s.port}(${s.available ? 'avail' : 'used'})`).join(', ')}`);

        return suggestions;
    }
}