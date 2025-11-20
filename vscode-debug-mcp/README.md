# VS Code Debug MCP Server

AI-powered debugging for VS Code via Model Context Protocol.

Provides AI assistants with complete control over VS Code's debugger through 14 specialized tools for session management, breakpoints, execution control, and code inspection.

## Features

### Session Management
- **debug_start** - Start debugging any file (auto-detects language)
- **debug_stop** - Stop debug session
- **debug_getStatus** - Get current execution state

### Breakpoint Management
- **debug_setBreakpoint** - Set breakpoints (with optional conditions)
- **debug_removeBreakpoint** - Remove breakpoints
- **debug_listBreakpoints** - List all active breakpoints

### Execution Control
- **debug_continue** - Continue to next breakpoint
- **debug_stepOver** - Step over current line
- **debug_stepInto** - Step into function call
- **debug_stepOut** - Step out of current function
- **debug_pause** - Pause execution

### Code Inspection
- **debug_getStackTrace** - Get call stack with function names and line numbers
- **debug_getVariables** - Inspect variables in current scope
- **debug_evaluate** - Evaluate expressions in debug context

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
```

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
