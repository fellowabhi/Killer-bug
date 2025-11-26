import * as net from 'net';

/**
 * Port Manager - handles port detection and allocation
 */
export class PortManager {
    /**
     * Check if a port is currently in use
     */
    static async isPortInUse(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();

            server.once('error', (err: any) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            server.once('listening', () => {
                server.close();
                resolve(false);
            });

            server.listen(port, '127.0.0.1');
        });
    }

    /**
     * Find the next available port starting from the given port
     */
    static async findAvailablePort(startPort: number = 3100): Promise<number> {
        let port = startPort;
        const maxAttempts = 100; // Try up to 100 ports

        for (let i = 0; i < maxAttempts; i++) {
            const inUse = await this.isPortInUse(port);
            if (!inUse) {
                console.log(`[Port Manager] Found available port: ${port}`);
                return port;
            }
            console.log(`[Port Manager] Port ${port} is in use, trying next...`);
            port++;
        }

        throw new Error(`Could not find available port after ${maxAttempts} attempts`);
    }

    /**
     * Get suggested ports (current + next 3 alternatives)
     */
    static async getSuggestedPorts(startPort: number = 3100, count: number = 3): Promise<number[]> {
        const suggestions: number[] = [];

        for (let i = 0; i < count; i++) {
            const port = startPort + i;
            const inUse = await this.isPortInUse(port);
            suggestions.push(port);
            console.log(`[Port Manager] Port ${port}: ${inUse ? 'IN USE' : 'AVAILABLE'}`);
        }

        return suggestions;
    }
}
