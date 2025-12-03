# Quick Test Prompt for AI Debug MCP Server v0.1.2

**IMPORTANT: Check the Debug Console for diagnostic logs!**

Copy and paste this to your AI assistant:

---

**Test the updated AI Debug MCP Server with enhanced isPaused detection:**

**Setup:**
- File: `/home/yatnam/projects/ai-debug-test/main.py` (or your test file)
- Focus: Verify `isPaused` flag now works correctly
- **Check Debug Console** for logs like: 🔍 🔄 ✅

**Test Sequence:**

1. **Start & Check Initial State**
   - `debug_start` with `stopOnEntry=true`
   - `debug_getStatus` → Report: `isPaused` value (should be TRUE)

2. **Breakpoint & Continue**
   - `debug_setBreakpoint` at line 18
   - `debug_continue`
   - `debug_getStatus` → Report: `isPaused` value (should be TRUE)

3. **Test Inspection Tools (THE BIG TEST!)**
   - `debug_getStackTrace` → Report: success/failure and data
   - `debug_getVariables` → Report: success/failure and variable names
   - `debug_evaluate` with `expression="x + y"` → Report: success/failure and result

4. **Test Stepping**
   - `debug_stepOver` 
   - `debug_getStatus` → Report: `isPaused` value (should be TRUE)
   - `debug_getVariables` → Report: still works?

5. **Test Continue to End**
   - `debug_continue` (run to completion)
   - `debug_getStatus` → Report: `isPaused` value (should be FALSE)

6. **Clean Up**
   - `debug_stop`

**Report Format:**
```
✅/❌ isPaused at start: [value]
✅/❌ isPaused at breakpoint: [value]
✅/❌ debug_getStackTrace: [worked/failed + why]
✅/❌ debug_getVariables: [worked/failed + sample data]
✅/❌ debug_evaluate: [worked/failed + result]
✅/❌ isPaused after step: [value]
✅/❌ isPaused when running: [value]

Debug Console Logs: [Copy the 🔍 and 🔄 log messages]
Critical Issue: [if any inspection tool still fails]
Overall: [Inspection tools work now? YES/NO]
```

**What Changed:** 
- Now tries to get stack trace first - if successful, MUST be paused!
- Added detailed logging to Debug Console
- Increased wait times to 500ms-1000ms
- More aggressive paused detection

**What We're Testing:** The `isPaused` flag should now correctly show TRUE when stopped, enabling the inspection tools (getStackTrace, getVariables, evaluate) to work.

---

**Please include the Debug Console output** - it shows what's happening internally!

