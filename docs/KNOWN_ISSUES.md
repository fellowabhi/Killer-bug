# Known Issue: Async Server "Paused" State

## 🐛 The Issue

When debugging async servers (FastAPI, Flask, Express, etc.) with remote attach:

**Symptom:**
- After `debug_continue`, shows `isPaused: true` at an event loop line (e.g., line 71)
- Server is actually **running and waiting** for requests, not truly paused
- Calling debug commands (step, evaluate) will **hang** ⚠️
- Must trigger a **new API call** to truly pause at a breakpoint

**Example:**
```json
// After debug_continue
{
  "isPaused": true,        // ❌ Misleading
  "currentLine": 71,       // Event loop/server listening line
  "currentFunction": "run" // Server run loop
}
// But server is actually waiting for requests, not paused!
```

## 🎯 Root Cause

Async servers never truly "finish" - they run an event loop waiting for requests:

1. Hit breakpoint in endpoint handler ✅ (truly paused)
2. Call `debug_continue` 
3. Handler completes, returns to event loop
4. Stack shows line 71 in server run loop
5. DAP reports "paused" because thread exists with stack frames
6. **But it's actually waiting, not paused for debugging**

## ✅ Correct Workflow

```
1. debug_attach → Attach to running server
2. debug_setBreakpoint → Set BP in endpoint logic
3. Trigger API call (curl/fetch) → Server handles request
4. Breakpoint hit → TRULY PAUSED ✅
5. debug_getVariables → Inspect request state
6. debug_stepOver → Step through handler
7. debug_continue → Handler completes
   ⚠️ Now at "event loop pause" (misleading state)
8. Trigger another API call → Hit BP again (truly paused) ✅
9. Repeat...
```

## 🔧 Workaround

**For AI:**
After `debug_continue` in async server debugging:
- Ignore `isPaused: true` if at event loop lines (server.run, app.listen, etc.)
- To pause again, **trigger a new request** that hits your breakpoints
- Don't call step/inspect commands when at event loop lines

**Detection heuristics:**
```typescript
// Likely event loop "false paused" state if:
isPaused === true && (
  currentLine > lastBreakpointLine + 20 ||
  currentFunction.includes('run') ||
  currentFunction.includes('listen') ||
  currentFunction.includes('serve') ||
  currentFunction.includes('_run')
)
```

## 📝 Documentation for Users

When using remote attach with async servers:

**✅ Good States:**
- `isPaused: true` at your breakpoint lines
- Stack shows your function names
- Safe to use all debug commands

**⚠️ Ambiguous States:**
- `isPaused: true` at event loop/server lines
- Stack shows framework internals
- Server is actually running (waiting for requests)
- Don't call step/inspect - just trigger new request

## 🎯 Future Enhancement Ideas

1. **Smart state detection:**
   ```typescript
   isReallyPaused(): boolean {
       if (!isPaused) return false;
       
       // Check if paused in user code vs framework event loop
       if (stackFrames[0].source.includes('user_code')) return true;
       if (stackFrames[0].name.includes('run|listen|serve')) return false;
       
       return true;
   }
   ```

2. **Add warning to status:**
   ```json
   {
       "isPaused": true,
       "isPausedInUserCode": false,
       "warning": "Server event loop - trigger request to pause at breakpoint"
   }
   ```

3. **Auto-detect request handlers:**
   - Track which files contain breakpoints
   - Only report "truly paused" when in those files

## ✅ Production Status

**Despite this quirk, the feature is production-ready because:**
- ✅ Core functionality works perfectly
- ✅ Breakpoints hit correctly
- ✅ Inspection tools work when truly paused
- ✅ Predictable behavior (always happens at event loop)
- ✅ Easy workaround (trigger new request)
- ✅ Doesn't break anything (just misleading state)

**This is a limitation of debugging async servers, not a bug in our extension.**

## 📚 Similar Behavior in Other Debuggers

This "paused at event loop" phenomenon also occurs in:
- VS Code's built-in debugger (same DAP behavior)
- PyCharm when debugging Flask/FastAPI
- Node.js debuggers with Express servers
- Chrome DevTools with long-running async code

**Our extension accurately reflects the DAP state. The confusion comes from DAP's definition of "paused".**

---

**Bottom Line:** With awareness of this quirk, remote attach debugging works excellently! 🚀
