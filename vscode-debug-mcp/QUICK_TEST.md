# Quick Test Guide

## 🚀 Start Testing

1. **Press F5** in VS Code to launch Extension Development Host
2. **Check Debug Console** for: `MCP server listening on http://localhost:3100`
3. **Verify health**: `curl http://localhost:3100/health`

## 📋 Complete Test Sequence

Copy this prompt for your AI assistant:

```
Test the AI Debug MCP Server with the file at /home/yatnam/projects/debug-mcp-test/debug_practice.py:

**Session Management:**
1. List available tools (should see 14 debug_* tools)
2. debug_start with stopOnEntry=true
3. debug_getStatus (verify sessionId, file, line 1)

**Breakpoints:**
4. debug_setBreakpoint at line 25 (in find_max_value function)
5. debug_setBreakpoint at line 15 with condition "x > 5"
6. debug_listBreakpoints (should show 2 breakpoints)

**Execution & State:**
7. debug_continue (should hit breakpoint at line 1 or 15)
8. debug_getStatus (verify currentLine updates, isPaused=true)

**Stack & Variables:**
9. debug_getStackTrace (show call stack)
10. debug_getVariables (show local variables: x, y, z, data, etc.)
11. debug_evaluate expression="len(data)"
12. debug_evaluate expression="max_value"

**Stepping:**
13. debug_stepOver (step 3 times)
14. debug_getStatus after each step (verify line changes)
15. debug_stepInto on a function call
16. debug_stepOut from that function

**Cleanup:**
17. debug_removeBreakpoint at line 15
18. debug_listBreakpoints (should show only line 25)
19. debug_stop

**Report:**
- ✅ Tools that worked perfectly
- ⚠️ Tools with issues
- ❌ Tools that failed
- State tracking quality (isPaused, currentLine, currentFunction)
- Variable inspection results
- Overall assessment
```

## 🎯 What to Verify

### State Tracking (Previously Broken ❌, Now Fixed ✅)
- `isPaused`: Should be `true` when stopped, `false` when running
- `currentLine`: Should update to actual line number when paused
- `currentFunction`: Should show function name when paused

### Inspection Tools (NEW ✨)
- `debug_getStackTrace`: Shows all frames with names and lines
- `debug_getVariables`: Lists variables with values and types
- `debug_evaluate`: Evaluates expressions and returns results

### Execution Control
- All step commands update `currentLine` immediately
- Breakpoint conditions work correctly
- Continue/pause affect `isPaused` state

## 📊 Expected Results

**Good State Tracking:**
```json
{
  "sessionId": "python-abc123",
  "file": "/home/yatnam/projects/debug-mcp-test/debug_practice.py",
  "currentLine": 25,
  "currentFunction": "find_max_value",
  "isPaused": true
}
```

**Stack Trace Example:**
```json
{
  "stackFrames": [
    {"index": 0, "name": "find_max_value", "line": 25},
    {"index": 1, "name": "main", "line": 35},
    {"index": 2, "name": "<module>", "line": 40}
  ]
}
```

**Variables Example:**
```json
{
  "variables": [
    {"name": "data", "value": "[1, 2, 3, 4, 5]", "type": "list", "scope": "Locals"},
    {"name": "max_value", "value": "3", "type": "int", "scope": "Locals"}
  ]
}
```

## 🐛 Known Issues from Previous Test

**Fixed:**
- ~~`currentLine` was always `null`~~ ✅ Now uses event-driven updates
- ~~`isPaused` was always `false`~~ ✅ Now tracks stopped/continued events
- ~~`currentFunction` was always `null`~~ ✅ Now extracts from stack frames

**New to Test:**
- Inspection tools are brand new (never tested before)
- Event-driven state tracking needs validation

## ✨ Key Improvements

1. **No More Polling**: Event-driven architecture
2. **3 New Tools**: Stack trace, variables, evaluate
3. **Better State**: Proper isPaused and currentLine tracking
4. **14 Total Tools**: Complete debugging capability

## 🔍 Success Criteria

- [ ] All 14 tools respond successfully
- [ ] State tracking shows real values (not null)
- [ ] isPaused toggles correctly
- [ ] currentLine updates during stepping
- [ ] Stack trace shows function hierarchy
- [ ] Variables include values and types
- [ ] Expression evaluation works
- [ ] Conditional breakpoints work

---

**After testing, share results with the developer for any fixes needed!**
