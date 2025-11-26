# VS Code Debug MCP Server

AI-powered debugging for VS Code via Model Context Protocol.

Provides AI assistants with complete control over VS Code's debugger through 17 specialized tools for session management, breakpoints, execution control, code inspection, and **remote debugging**.

## Features

### Session Management (6 tools)
- **debug_start** - Start debugging any file (auto-detects language)
- **debug_stop** - Stop debug session
- **debug_getStatus** - Get current execution state
- **debug_listConfigs** - List debug configurations from launch.json ⭐ NEW
- **debug_startWithConfig** - Use existing launch.json configurations ⭐ NEW
- **debug_attach** - Attach to running process (FastAPI, Node.js, etc.) ⭐ NEW

### Breakpoint Management (3 tools)
- **debug_setBreakpoint** - Set breakpoints (with optional conditions)
- **debug_removeBreakpoint** - Remove breakpoints
- **debug_listBreakpoints** - List all active breakpoints

### Execution Control (5 tools)
- **debug_continue** - Continue to next breakpoint
- **debug_stepOver** - Step over current line
- **debug_stepInto** - Step into function call
- **debug_stepOut** - Step out of current function
- **debug_pause** - Pause execution

### Code Inspection (3 tools)
- **debug_getStackTrace** - Get call stack with function names and line numbers
- **debug_getVariables** - Inspect variables in current scope
- **debug_evaluate** - Evaluate expressions in debug context

## Remote Debugging 🆕

Version 0.2.0 adds support for attaching to running processes and using your existing launch.json configurations.

**Example: FastAPI Debugging**
```
1. AI starts: python -m debugpy --listen 5678 main.py
2. AI attaches: debug_attach({ type: "debugpy", port: 5678 })
3. AI sets breakpoints and calls your API
4. AI inspects variables and finds bugs automatically!
```

See [REMOTE_DEBUGGING.md](REMOTE_DEBUGGING.md) for complete guide with examples.

## Installation

### From Marketplace (Coming Soon)
1. Search "AI Debug MCP" in VS Code Extensions
2. Click Install
3. Extension auto-starts on activation

### Development Install
1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Press F5 to launch Extension Development Host

## Architecture

The extension runs an HTTP JSON-RPC server on `localhost:3100` that implements the Model Context Protocol. AI assistants connect via HTTP to access debug tools.

```
VS Code Extension → HTTP Server (port 3100) → MCP Tools → VS Code Debug API
```

## MCP Client Configuration

Configure your AI assistant's MCP client to connect:

```json
{
  "mcpServers": {
    "ai-debugger": {
      "type": "http",
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

### IDE-Specific Configuration

The extension provides two commands to auto-configure the MCP settings:

**For VS Code Users:**
- Command: `AI Debugger: Configure VS Code MCP`
- Configures: `~/.config/Code/User/mcp.json` (Linux), `~/Library/Application Support/Code/User/mcp.json` (macOS), `%APPDATA%\Code\User\mcp.json` (Windows)

**For Cursor IDE Users:**
- Command: `AI Debugger: Configure Cursor MCP`
- Configures: `~/.cursor/mcp.json` (Linux), `~/Library/Application Support/Cursor/User/mcp.json` (macOS), `%APPDATA%\Cursor\User\mcp.json` (Windows)

**How to use:**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Search for the appropriate command based on your IDE
3. Click to auto-configure your MCP settings (one-click setup!)
4. Restart your AI assistant to use the debugger

## Usage

1. **Extension activates automatically** when VS Code starts
2. **MCP server starts** on port 3100
3. **AI connects** via HTTP JSON-RPC
4. **Debug any file** by asking your AI assistant:

Example prompts:
```
"Debug the file app.py and set a breakpoint at line 42"
"Step through the calculate_total function and show me the variables"
"What's the current call stack?"
"Evaluate the expression user.name in the current context"
"List my debug configurations"
"Attach to my FastAPI server on port 5678"
"Start debugging using my 'FastAPI Attach' configuration"
```

## Use Cases

### Traditional Debugging
- Debug any Python/JavaScript/TypeScript file
- Set breakpoints and step through code
- Inspect variables and evaluate expressions

### Remote Debugging (NEW!)
- **FastAPI/Flask**: Attach to running web server, debug API endpoints
- **Node.js**: Attach to running Node apps with --inspect
- **Containers**: Use existing launch.json configs with path mappings
- **Team Configs**: Leverage shared launch.json configurations

## Supported Languages

Automatically detects and supports debugging for:
- Python (`.py`)
- JavaScript/TypeScript (`.js`, `.ts`, `.mjs`)
- And more through VS Code's debug adapters

## Testing

See [TESTING.md](TESTING.md) for comprehensive testing instructions.

Quick test:
```bash
curl http://localhost:3100/health
```

## Technical Details

- **Transport**: HTTP JSON-RPC (simple, testable, reliable)
- **Port**: 3100 (configurable)
- **Protocol**: Model Context Protocol 2024-11-05
- **State Tracking**: Event-driven (stopped/continued events + active stack item changes)

## Development

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Launch development instance
# Press F5 in VS Code

# The extension will compile and open a new VS Code window
# Check Debug Console for "MCP server listening on http://localhost:3100"
```

## Troubleshooting

**Extension not starting?**
- Check Output → Extension Host for errors
- Verify port 3100 is available

**Tools not working?**
- Ensure a debug session is active for inspection tools
- Check Debug Console for MCP server logs

**AI can't connect?**
- Verify `http://localhost:3100/health` responds
- Check MCP client configuration

## Contributing

Issues and pull requests welcome!

## License

MIT
