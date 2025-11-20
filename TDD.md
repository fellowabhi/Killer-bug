# Technical Design Document: AI Debug MCP Server

**Version**: 1.0  
**Date**: November 20, 2025  
**Status**: Draft

## 1. Overview

A VS Code extension that provides an MCP (Model Context Protocol) server for AI-powered debugging. Enables AI assistants to interact with VS Code's debugger programmatically.

## 2. Goals

- **Primary**: Give AI full debugger control (breakpoints, stepping, inspection)
- **Secondary**: Simple installation (1-click from marketplace)
- **Non-goal**: Replace VS Code's debug UI

## 3. Architecture

```
┌─────────────────────┐
│   AI Assistant      │
│   (GitHub Copilot)  │
└──────────┬──────────┘
           │ MCP Protocol (stdio)
┌──────────▼──────────┐
│   MCP Server        │
│   (Our Extension)   │
└──────────┬──────────┘
           │ VS Code Debug API
┌──────────▼──────────┐
│  VS Code Debugger   │
└──────────┬──────────┘
           │ Debug Adapter Protocol
┌──────────▼──────────┐
│  Language Debuggers │
│  (debugpy, node,    │
│   gdb, etc.)        │
└─────────────────────┘
```

## 4. Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Language | TypeScript | VS Code standard, type-safe |
| MCP SDK | `@modelcontextprotocol/sdk` | Official MCP implementation |
| Build | esbuild | Fast, simple bundling |
| Package | vsce | VS Code extension packager |
| Runtime | Node.js (bundled) | Built into VS Code |

## 5. MCP Tools Design

### 5.1 Session Management
```typescript
debug_start({ 
  file: string,           // File to debug
  type?: string,          // "python" | "node" | auto-detect
  stopOnEntry?: boolean   // Stop at first line
})
→ { sessionId, status }

debug_stop()
→ { status }

debug_getStatus()
→ { 
  active: boolean,
  file: string,
  line: number,
  function: string,
  paused: boolean
}
```

### 5.2 Breakpoints
```typescript
debug_setBreakpoint({ 
  file: string,
  line: number,
  condition?: string      // e.g., "x > 10"
})
→ { id, verified }

debug_removeBreakpoint({ 
  file: string, 
  line: number 
})
→ { status }

debug_listBreakpoints()
→ [{ file, line, condition, verified }]
```

### 5.3 Execution Control
```typescript
debug_continue()
→ { stopped: boolean, reason?: string, line?: number }

debug_stepOver()
→ { line: number, file: string }

debug_stepInto()
→ { line: number, file: string }

debug_stepOut()
→ { line: number, file: string }

debug_pause()
→ { line: number, file: string }
```

### 5.4 Inspection
```typescript
debug_getStackTrace()
→ [{ 
  name: string,          // function name
  file: string,
  line: number,
  frameId: number
}]

debug_getVariables({ 
  scope?: "local" | "global" | "all",
  frameId?: number       // Default: current frame
})
→ { 
  name: string, 
  value: string, 
  type: string 
}[]

debug_evaluate({ 
  expression: string,
  frameId?: number
})
→ { result: string, type: string }
```

## 6. State Management

```typescript
class DebugState {
  sessionId: string | null
  currentFile: string | null
  currentLine: number | null
  currentFunction: string | null
  isPaused: boolean
  stackFrames: StackFrame[]
  breakpoints: Map<string, Breakpoint[]>  // file → breakpoints
  
  // Updated via VS Code debug events
  onBreakpointHit(event)
  onSessionStart(event)
  onSessionEnd(event)
  onThreadStopped(event)
}
```

## 7. File Structure

```
vscode-debug-mcp/
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── esbuild.js                # Build script
├── src/
│   ├── extension.ts          # Extension entry point
│   │                         # - Registers MCP command
│   │                         # - Starts MCP server
│   │
│   ├── mcp-server.ts         # MCP server setup
│   │                         # - stdio transport
│   │                         # - Tool registration
│   │
│   ├── debug-state.ts        # State tracker
│   │                         # - Listen to debug events
│   │                         # - Maintain current state
│   │
│   └── tools/
│       ├── session.ts        # Session tools (start/stop/status)
│       ├── breakpoints.ts    # Breakpoint tools
│       ├── execution.ts      # Execution control tools
│       └── inspection.ts     # Inspection tools
│
└── README.md
```

## 8. Key Implementation Details

### 8.1 MCP Server Lifecycle
```typescript
// In extension.ts
export function activate(context: vscode.ExtensionContext) {
  // Register command that AI will call
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-debug-mcp.start', () => {
      startMCPServer();
    })
  );
  
  // Auto-configure MCP on first activation
  offerMCPConfiguration();
}

function startMCPServer() {
  const server = new Server({ name: 'vscode-debug-mcp', version: '1.0.0' }, {
    capabilities: { tools: {} }
  });
  
  // Register all tools
  registerSessionTools(server);
  registerBreakpointTools(server);
  registerExecutionTools(server);
  registerInspectionTools(server);
  
  // Start stdio transport
  const transport = new StdioServerTransport();
  server.connect(transport);
}
```

### 8.2 Debug Event Handling
```typescript
// Track state via VS Code events
vscode.debug.onDidChangeActiveDebugSession((session) => {
  if (session) {
    debugState.sessionId = session.id;
    debugState.currentFile = session.configuration.program;
  }
});

vscode.debug.onDidChangeBreakpoints((e) => {
  // Update breakpoint map
  debugState.updateBreakpoints(e.added, e.removed);
});

// Listen for thread stopped (breakpoint hit, step complete)
session.customRequest('threads').then(threads => {
  threads.forEach(thread => {
    if (thread.stopped) {
      // Get stack trace and update current position
      session.customRequest('stackTrace', { threadId: thread.id })
        .then(frames => {
          debugState.currentLine = frames[0].line;
          debugState.currentFile = frames[0].source.path;
          debugState.stackFrames = frames;
        });
    }
  });
});
```

### 8.3 Debug Configuration Auto-Detection
```typescript
async function startDebug(file: string, type?: string) {
  // Auto-detect language if not specified
  if (!type) {
    const ext = path.extname(file);
    type = extensionToDebugType[ext];  // .py → python, .js → node
  }
  
  const config = {
    type: type,
    request: 'launch',
    name: 'AI Debug Session',
    program: file,
    stopOnEntry: false,
    console: 'integratedTerminal'
  };
  
  await vscode.debug.startDebugging(undefined, config);
}
```

## 9. Error Handling

```typescript
// Wrap all tool calls with error handling
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* ... */]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await handleTool(request.params.name, request.params.arguments);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  } catch (error) {
    return { 
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true 
    };
  }
});
```

## 10. Development Phases

### Phase 1: Core Foundation (Week 1)
- [ ] Project setup (package.json, tsconfig)
- [ ] Basic extension activation
- [ ] MCP server with stdio transport
- [ ] Session tools (start/stop/status)
- [ ] Test with simple Python script

### Phase 2: Breakpoints & Execution (Week 2)
- [ ] Breakpoint management tools
- [ ] Execution control (continue/step)
- [ ] State tracking via debug events
- [ ] Test stepping through code

### Phase 3: Inspection (Week 3)
- [ ] Stack trace tool
- [ ] Variable inspection
- [ ] Expression evaluation
- [ ] Test complex debugging scenarios

### Phase 4: Polish (Week 4)
- [ ] Multi-language support (Python, Node.js, Go)
- [ ] Auto-configuration on install
- [ ] Error handling & edge cases
- [ ] Documentation & examples
- [ ] Publish to marketplace

## 11. Testing Strategy

```typescript
// Manual Testing
1. Install extension in VS Code
2. Configure MCP in workspace
3. Use AI to debug sample files:
   - Python script with bugs
   - Node.js server with logic errors
   - Multi-threaded program

// AI Interaction Tests
User: "Debug script.py and find why max value is wrong"
Expected:
  1. AI sets breakpoint in find_max_value
  2. AI starts debug session
  3. AI steps through loop
  4. AI inspects variables
  5. AI identifies bug (range issue)
  6. AI reports findings
```

## 12. Installation & Usage

### For Users
```bash
# Install from marketplace
1. Open VS Code Extensions
2. Search "AI Debug MCP Server"
3. Click Install
4. Accept MCP configuration prompt
```

### MCP Configuration (auto-generated)
```json
{
  "servers": {
    "vscode-debug-mcp": {
      "type": "stdio",
      "command": "vscode-debug-mcp.start"
    }
  }
}
```

## 13. Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.0",
    "esbuild": "^0.19.0",
    "@vscode/vsce": "^2.22.0"
  }
}
```

## 14. Success Metrics

- ✅ AI can debug without user intervention
- ✅ Works with Python, JavaScript, TypeScript
- ✅ Installation < 1 minute
- ✅ No configuration required (auto-setup)
- ✅ Reliable state tracking (no missed breakpoints)

## 15. Future Enhancements (v2.0)

- Conditional breakpoints UI
- Watch expressions
- Debug multiple sessions
- Remote debugging support
- Performance profiling integration
- Test debugging integration

---

**Next Steps**: 
1. Review & approve design
2. Set up project scaffolding
3. Begin Phase 1 implementation
