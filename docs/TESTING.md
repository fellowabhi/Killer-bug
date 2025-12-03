# Testing the AI Debug MCP Server

## Architecture (HTTP JSON-RPC)

```
VS Code Extension
  ↓ (auto-starts on activation)
HTTP Server on localhost:3100
  ↓ (HTTP JSON-RPC transport)
MCP Server with VS Code Debug APIs
  ↓
AI Client connects via HTTP
```

## How to Test

### 1. Launch Extension Development Host

- Press **F5** in this VS Code window
- New VS Code window opens with extension loaded

### 2. Verify Extension Activated

Check the Debug Console (original window) for:
```
AI Debug MCP Server extension is activating...
MCP server listening on http://localhost:3100
MCP endpoint: POST http://localhost:3100/mcp
Health check: GET http://localhost:3100/health
AI Debug MCP Server extension activated
```

### 3. Test Health Endpoint (Optional)

In a terminal:
```bash
curl http://localhost:3100/health
```

Should return:
```json
{"status":"ok","server":"vscode-debug-mcp","version":"0.1.0","tools":14,"endpoint":"/mcp"}
```

### 4. Configure MCP Client (in the F5 window)

Create/update MCP configuration for HTTP transport:

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

### 5. Test Prompt for AI

Give this prompt to the AI in the F5 window:

---

**Test Prompt:**

```
Test the AI Debug MCP Server with debug_practice.py:

1. Check available MCP tools - you should see 14 debug_* tools
2. Use debug_start with file="/home/yatnam/projects/debug-mcp-test/debug_practice.py" and stopOnEntry=true
3. Use debug_getStatus to check where we are (should show line 1)
4. Use debug_setBreakpoint at line 25 (the buggy loop in find_max_value)
5. Use debug_continue to run until breakpoint
6. Use debug_getStackTrace to see the call stack
7. Use debug_getVariables to inspect local variables (x, y, z, data, etc.)
8. Use debug_evaluate with expression "len(data)" to check the array length
9. Use debug_stepOver 3 times to step through the loop
10. Use debug_getStatus after each step to verify currentLine updates
11. Use debug_listBreakpoints to verify breakpoints
12. Use debug_stop to end session

Report:
- Which tools worked ✅
- Which tools failed ❌  
- Error messages
- Current state at each step (isPaused, currentLine, currentFunction)
- Variable values seen
- Overall assessment
```

---

## Expected Behavior

### All 14 Tools:

**Session Management:**
- ✅ `debug_start` - Starts debugging with auto-detected language
- ✅ `debug_stop` - Stops debug session
- ✅ `debug_getStatus` - Returns session info with current line and function

**Breakpoint Management:**
- ✅ `debug_setBreakpoint` - Sets breakpoint (with optional condition)
- ✅ `debug_removeBreakpoint` - Removes breakpoint
- ✅ `debug_listBreakpoints` - Lists all breakpoints

**Execution Control:**
- ✅ `debug_continue` - Continues execution
- ✅ `debug_stepOver` - Steps over line
- ✅ `debug_stepInto` - Steps into function
- ✅ `debug_stepOut` - Steps out of function
- ✅ `debug_pause` - Pauses execution

**Inspection (NEW):**
- ✅ `debug_getStackTrace` - Get call stack with frames, functions, lines
- ✅ `debug_getVariables` - Get variables in current scope (local/global)
- ✅ `debug_evaluate` - Evaluate expressions in debug context

### Improved State Tracking:
- Event-driven architecture (no polling)
- `isPaused` updates on stopped/continued events
- `currentLine` and `currentFunction` update from stack frames
- Tracks active stack item changes

## Troubleshooting

**Extension not activating?**
- Check Output panel → "Extension Host"
- Look for error messages

**MCP tools not available?**
- The extension should auto-start MCP server
- Check extension is loaded: Extensions view, search "AI Debug MCP"

**Debugging not starting?**
- Ensure Python/Node.js debugger extensions are installed
- Check file path is absolute and exists

## Success Criteria

- [ ] Extension activates without errors
- [ ] MCP server starts automatically on port 3100
- [ ] All 14 tools are available to AI
- [ ] Can start/stop debug sessions
- [ ] Can set/remove breakpoints (including conditional)
- [ ] Can step through code (over/into/out)
- [ ] State tracking works (isPaused, currentLine, currentFunction)
- [ ] Can get stack trace with function names and lines
- [ ] Can inspect variables in current scope
- [ ] Can evaluate expressions in debug context
