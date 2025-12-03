# Remote Debugging Guide

## Overview

Version 0.2.0 adds support for remote debugging and using existing launch.json configurations. This enables AI assistants to:
- Attach to running processes (e.g., FastAPI, Node.js servers)
- Use your existing VS Code debug configurations
- Debug containerized or remote applications

## New Tools (3)

### 1. `debug_listConfigs`
List all available debug configurations from your workspace's [`.vscode/launch.json`](.vscode/launch.json ).

**Parameters:** None

**Returns:**
```json
{
  "success": true,
  "workspaces": [
    {
      "workspace": "my-project",
      "workspacePath": "/path/to/my-project",
      "configurations": [
        {
          "name": "Python: Debug Current File",
          "type": "debugpy",
          "request": "launch",
          "program": "${file}"
        },
        {
          "name": "FastAPI Remote Attach",
          "type": "debugpy",
          "request": "attach",
          "host": "localhost",
          "port": 5678
        }
      ]
    }
  ],
  "totalConfigs": 2
}
```

**Use Case:**
"Show me available debug configurations" → AI uses `debug_listConfigs` to see what's in your [`.vscode/launch.json`](.vscode/launch.json )

---

### 2. `debug_startWithConfig`
Start debugging using a named configuration from launch.json.

**Parameters:**
- `configName` (required): Name of the configuration
- `folder` (optional): Workspace folder name (for multi-root workspaces)

**Example:**
```json
{
  "configName": "FastAPI Remote Attach"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Started debugging with configuration: FastAPI Remote Attach",
  "configName": "FastAPI Remote Attach",
  "configType": "debugpy",
  "configRequest": "attach",
  "sessionId": "debugpy-session-123",
  "isPaused": false
}
```

**Use Case:**
You have a FastAPI attach config in launch.json → AI uses `debug_startWithConfig` to connect

---

### 3. `debug_attach`
Attach to a running debugger without requiring launch.json configuration.

**Parameters:**
- `port` (required): Port number the debugger is listening on
- `type` (optional): Debugger type - `debugpy`, `python`, `node`, `pwa-node` (default: `debugpy`)
- `host` (optional): Host to connect to (default: `localhost`)
- `pathMappings` (optional): Path mappings for remote/container debugging
- `name` (optional): Custom name for the session

**Example:**
```json
{
  "type": "debugpy",
  "port": 5678,
  "host": "localhost"
}
```

**Returns:**
```json
{
  "success": true,
  "message": "Attached to debugpy debugger at localhost:5678",
  "type": "debugpy",
  "host": "localhost",
  "port": 5678,
  "sessionId": "debugpy-attach-456",
  "isPaused": false
}
```

**Use Case:**
Quick attach when you don't have a launch.json config or want to specify port dynamically

---

## Complete Workflows

### Workflow 1: FastAPI Debugging (Using launch.json)

**Your launch.json:**
```json
{
  "configurations": [
    {
      "name": "FastAPI Attach",
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

**AI Workflow:**
```
1. User: "Start the FastAPI server with debugging"
2. AI runs: uvicorn main:app --reload (with debugpy listening)
3. AI calls: debug_listConfigs() → sees "FastAPI Attach"
4. AI calls: debug_startWithConfig({ configName: "FastAPI Attach" })
5. AI calls: debug_setBreakpoint({ file: "main.py", line: 42 })
6. User: "Call the /users endpoint"
7. AI runs: curl http://localhost:8000/users
8. Breakpoint hits!
9. AI calls: debug_getVariables() → sees request data
10. AI calls: debug_getStackTrace() → sees call stack
11. AI reports findings to user
```

### Workflow 2: Quick Remote Attach (No launch.json)

**Scenario:** You manually started your FastAPI app with debugpy on port 5678

**AI Workflow:**
```
1. User: "Attach to my running FastAPI on port 5678"
2. AI calls: debug_attach({ type: "debugpy", port: 5678 })
3. AI calls: debug_setBreakpoint({ file: "main.py", line: 42 })
4. User: "Call the /users endpoint"
5. AI runs: curl http://localhost:8000/users
6. Breakpoint hits!
7. AI debugs and reports
```

### Workflow 3: Node.js Remote Debugging

**Your launch.json:**
```json
{
  "configurations": [
    {
      "name": "Attach to Node",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

**AI Workflow:**
```
1. AI runs: node --inspect=9229 app.js
2. AI calls: debug_startWithConfig({ configName: "Attach to Node" })
3. AI sets breakpoints and debugs
```

---

## Starting Your Application for Remote Debugging

### Python (debugpy)

**Option 1: Command line**
```bash
python -m debugpy --listen 5678 --wait-for-client main.py
```

**Option 2: In code**
```python
import debugpy
debugpy.listen(5678)
debugpy.wait_for_client()  # Optional: wait for debugger to attach
# Your code here
```

**FastAPI example:**
```python
import debugpy
debugpy.listen(5678)

import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Node.js

```bash
node --inspect=9229 app.js
# or
node --inspect-brk=9229 app.js  # Break at first line
```

---

## Benefits

### Why Use launch.json Configs?
✅ Reuse your existing configurations
✅ Complex setups already defined
✅ Path mappings for containers/remote
✅ Environment variables and args
✅ Team can share configs via Git

### Why Use debug_attach?
✅ Quick one-off debugging
✅ Dynamic port numbers
✅ No configuration needed
✅ Simple scenarios

---

## Example: Complete FastAPI Debug Session

```
User: "I need to debug my FastAPI /users endpoint"

AI: Let me help you debug that. First, let me see your debug configurations.
    → debug_listConfigs()
    
AI: I see you have "FastAPI Attach" configured. Let me start your server with debugging:
    → Runs: python -m debugpy --listen 5678 main.py
    
AI: Now attaching the debugger...
    → debug_startWithConfig({ configName: "FastAPI Attach" })
    
AI: Setting a breakpoint at the /users endpoint (line 25)...
    → debug_setBreakpoint({ file: "main.py", line: 25 })
    
AI: Calling the endpoint...
    → Runs: curl http://localhost:8000/users
    
[Breakpoint hits!]

AI: Breakpoint hit! Let me inspect the variables...
    → debug_getVariables()
    
AI: I can see the issue - the user_id variable is undefined. Let me check the stack...
    → debug_getStackTrace()
    
AI: The problem is in the get_user() function. The user_id parameter isn't being passed correctly.
    
User: "Thanks! Can you fix it?"

AI: [Makes the fix and continues debugging...]
```

---

## Tips

1. **Always list configs first** - Know what's available before trying to use it
2. **Use launch.json for complex setups** - Path mappings, env vars, etc.
3. **Use debug_attach for quick tasks** - Simple port-based attachment
4. **Wait for debugger** - Use `debugpy.wait_for_client()` if starting app before attaching
5. **Check isPaused** - Verify attachment succeeded before setting breakpoints

---

## Tool Count Summary

**Version 0.2.0: 17 Total Tools**
- Session Management: 6 tools (start, stop, status, listConfigs, startWithConfig, attach)
- Breakpoint Management: 3 tools
- Execution Control: 5 tools
- Code Inspection: 3 tools
