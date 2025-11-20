# Remote Attach Testing - v0.2.0

## 🎯 What's New
- **3 new tools** for remote debugging
- Total: **17 tools** (was 14)

## New Tools

1. **`debug_listConfigs`** - List all debug configs from launch.json
2. **`debug_startWithConfig`** - Start debugging with a named config
3. **`debug_attach`** - Attach to running process (FastAPI, etc.)

## Quick Test for Your Tester

Copy this prompt:

---

**Test Remote Attach Tools:**

**Setup:**
1. FastAPI app running with debugpy listening on port 5678
2. Launch.json has remote attach config

**Test Sequence:**

1. **List Available Configs**
   ```
   debug_listConfigs
   ```
   Expected: Shows all configurations from launch.json

2. **Attach Using Config Name**
   ```
   debug_startWithConfig({ configName: "Python: Remote Attach" })
   ```
   Expected: Attaches to running FastAPI server

3. **Or Attach Directly**
   ```
   debug_attach({ type: "debugpy", port: 5678 })
   ```
   Expected: Attaches without needing launch.json

4. **Verify Connection**
   ```
   debug_getStatus
   ```
   Expected: Shows attached session, isPaused depends on stopOnEntry

5. **Set Breakpoint**
   ```
   debug_setBreakpoint({ file: "/path/to/main.py", line: 42 })
   ```

6. **Trigger Endpoint**
   - Call the FastAPI endpoint: `curl http://localhost:8000/endpoint`
   - Should hit breakpoint

7. **Inspect State**
   ```
   debug_getStackTrace
   debug_getVariables
   debug_evaluate({ expression: "some_variable" })
   ```

8. **Clean Up**
   ```
   debug_stop
   ```

**Report:**
- ✅/❌ debug_listConfigs works
- ✅/❌ debug_startWithConfig works  
- ✅/❌ debug_attach works
- ✅/❌ Can set breakpoints after attach
- ✅/❌ Inspection tools work when paused
- Any errors or issues

---

## FastAPI Example Setup

```python
# main.py
import debugpy
from fastapi import FastAPI

# Enable remote debugging
debugpy.listen(("0.0.0.0", 5678))
print("🔍 Debugpy is listening on port 5678")
# debugpy.wait_for_client()  # Uncomment to wait for debugger

app = FastAPI()

@app.get("/")
def read_root():
    x = 5
    y = 3
    result = x + y  # Set breakpoint here
    return {"result": result}

@app.get("/calculate")
def calculate(a: int, b: int):
    result = a + b  # Or breakpoint here
    return {"calculation": result}
```

```json
// launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Remote Attach",
            "type": "debugpy",
            "request": "attach",
            "connect": {
                "host": "localhost",
                "port": 5678
            },
            "pathMappings": [
                {
                    "localRoot": "${workspaceFolder}",
                    "remoteRoot": "."
                }
            ]
        }
    ]
}
```

## Expected Behavior

✅ **debug_listConfigs** → Returns all configs from launch.json  
✅ **debug_startWithConfig** → Attaches using named config  
✅ **debug_attach** → Attaches with explicit parameters  
✅ **After attach:** Can set breakpoints, step, inspect variables  
✅ **Breakpoints:** Hit when endpoint is called  
✅ **Inspection:** Works same as regular debugging  

## Troubleshooting

**"Unknown tool" error:**
- ✅ FIXED! Tools now registered in routing

**Can't attach:**
- Ensure FastAPI is running with `debugpy.listen()`
- Check port number matches
- Verify no firewall blocking

**Breakpoint not hit:**
- Ensure path in `debug_setBreakpoint` matches exactly
- Use absolute paths
- Check pathMappings if using containers

---

**The tools are now properly registered and should work!** 🚀
