# Testing the AI Debug MCP Server

## Architecture (HTTP/SSE)

```
VS Code Extension
  ↓ (auto-starts on activation)
HTTP Server on localhost:3100
  ↓ (SSE transport)
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
SSE endpoint: http://localhost:3100/sse
Health check: http://localhost:3100/health
AI Debug MCP Server extension activated
```

### 3. Test Health Endpoint (Optional)

In a terminal:
```bash
curl http://localhost:3100/health
```

Should return:
```json
{"status":"ok","server":"vscode-debug-mcp","version":"0.1.0","tools":11}
```

### 4. Configure MCP Client (in the F5 window)

Create/update `.vscode/mcp.json`:

```json
{
  "servers": {
    "ai-debugger": {
      "type": "sse",
      "url": "http://localhost:3100/sse"
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

1. Check available MCP tools - you should see 11 debug_* tools
2. Use debug_start with file="/home/yatnam/projects/debug-mcp-test/debug_practice.py"
3. Use debug_setBreakpoint at line 25 (the buggy loop in find_max_value)
4. Use debug_continue to run until breakpoint
5. Use debug_getStatus to check where we are
6. Use debug_stepOver 3 times to step through the loop
7. Use debug_listBreakpoints to verify breakpoints
8. Use debug_stop to end session

Report:
- Which tools worked ✅
- Which tools failed ❌  
- Error messages
- Current state at each step
- Overall assessment
```

---

## Expected Behavior

### Tools Should Work:
- ✅ `debug_start` - Starts debugging Python file
- ✅ `debug_stop` - Stops debug session
- ✅ `debug_getStatus` - Returns session info
- ✅ `debug_setBreakpoint` - Sets breakpoint
- ✅ `debug_removeBreakpoint` - Removes breakpoint
- ✅ `debug_listBreakpoints` - Lists all breakpoints
- ✅ `debug_continue` - Continues execution
- ✅ `debug_stepOver` - Steps over line
- ✅ `debug_stepInto` - Steps into function
- ✅ `debug_stepOut` - Steps out of function
- ✅ `debug_pause` - Pauses execution

### Known Limitations:
- State tracking (isPaused, currentLine) relies on polling and may have slight delays
- Some debuggers may not support all features (language-specific)

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
- [ ] MCP server starts automatically
- [ ] All 11 tools are available to AI
- [ ] Can start/stop debug sessions
- [ ] Can set/remove breakpoints
- [ ] Can step through code
- [ ] State tracking works (shows current line/file)
