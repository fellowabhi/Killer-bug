# Killer Bug AI Debugger

**Let your AI assistant debug your code automatically for accurate runtime context**

An MCP-powered debugging extension that gives **VS Code Copilot**, **Cursor AI**, Claude Desktop, ChatGPT, and other AI assistants complete control over VS Code's debugger. AI can now set breakpoints, step through code, inspect variables, and find bugs—all without you touching the keyboard.

## ⚡ Quick Start

1. **Install** the extension from VS Code marketplace
2. **Configure** (for each project):
   - Extension shows "Configuration Required" popup → Click it
   - Or run: `Killer Bug: Configure AI Debugger` from Command Palette
   - Select your IDE (VS Code or Cursor)
3. **Connect** your AI:
   - **Cursor**: Go to Settings → Enable MCP Server "killer-bug-<your-project-name>"
   - **VS Code**: Open `mcp.json` → Click "Start" icon on top of "killer-bug-<your-project-name>" in servers
4. **Start debugging**: Chat with your AI: *"Debug this code and find the bug"*

That's it! Your AI debugger is ready.

---

## 🎯 What It Does

### 🎬 Live Debugging
Your AI can:
- Start debugging any file (Python, JavaScript, TypeScript, etc.)
- Set breakpoints and conditional breakpoints
- Step through code line by line
- Inspect variables and the call stack
- Evaluate expressions in real-time

**[GIF: AI Setting Breakpoint and Stepping Through Code]**

### 🔗 Remote Debugging
- Attach to running servers (FastAPI, Node.js, Flask, etc.)
- Debug over the network or in containers
- Use your existing `launch.json` configurations
- Perfect for production debugging

**[GIF: AI Attaching to Running FastAPI Server and Inspecting Variables]**

### 🧠 AI-Powered Bug Hunting
- AI automatically explores your code
- Sets strategic breakpoints
- Finds and explains bugs
- Suggests fixes

**[GIF: AI Finding and Explaining a Bug]**

---

## 📚 How It Works

```
Your AI → MCP Protocol → Killer Bug → VS Code Debugger → Your Code
```

The extension runs an HTTP server that implements the Model Context Protocol. Your AI connects and controls the debugger through 17 specialized tools.

---

## 🛠️ Features & Tools

**Session Control**
- Start debugging any file (auto-detects language)
- Stop debug session
- Check execution state
- List and use existing `launch.json` configurations
- Attach to running processes

**Breakpoints**
- Set breakpoints with conditions
- Remove breakpoints
- List all breakpoints

**Execution**
- Continue to next breakpoint
- Step over/into/out of functions
- Pause execution

**Inspection**
- View call stack with function names & line numbers
- Inspect variables in current scope
- Evaluate expressions safely

---

## 🚀 Installation & Setup

### Marketplace (Recommended)
1. Open VS Code → Extensions
2. Search `Killer Bug AI Debugger`
3. Click Install

### Development
```bash
git clone <repo>
cd vscode-debug-mcp
npm install
npm run build
# Press F5 to launch
```

### Configure for Your AI

**One-Click Setup:**
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run: `Killer Bug: Configure AI Debugger`
3. Select your IDE (VS Code or Cursor)
4. Done! Restart your AI assistant

Or manual configuration for your MCP client:

```json
{
  "mcpServers": {
    "killer-bug-debugger": {
      "type": "http",
      "url": "http://localhost:3100/mcp"
    }
  }
}
```

---

## 💬 Usage Examples

**Basic Debugging:**
> "Debug the file `app.py` and set a breakpoint at line 42"

**Step Through Code:**
> "Step through the `calculate_total` function and show me the variables"

**Inspect State:**
> "What's the current call stack? Show me the value of `user`"

**Remote Debugging:**
> "Attach to my FastAPI server running on port 5678 and debug the `/api/users` endpoint"

**Using Configurations:**
> "Start debugging using my 'FastAPI Debug' configuration from launch.json"

---

## 🎥 Video Examples

**[GIF/VIDEO: Basic Debugging Workflow]**
*AI sets breakpoint, steps through code, finds the bug*

**[GIF/VIDEO: Remote Server Debugging]**
*AI attaches to FastAPI, tests API endpoint, inspects response*

**[GIF/VIDEO: Production Debugging]**
*AI debugs containerized app using launch.json configuration*

---

## 🌍 Supported Languages

Automatically debugs:
- Python (`.py`)
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- And any language with VS Code debug adapter support

---

## ❓ FAQ

**Q: Is my code safe?**
A: Yes. The debugger only reads variables and evaluates safe expressions. No code modification without explicit AI request.

**Q: Works with any AI?**
A: Yes! Works with **VS Code Copilot**, **Cursor AI**, Claude Desktop, ChatGPT, and any AI/LLM that supports MCP protocol.

**Q: What about privacy?**
A: The server runs locally. All debugging happens on your machine. No data sent anywhere.

**Q: Can I use it for production?**
A: Yes! Remote debugging is perfect for debugging live servers safely.

---

## 🐛 Troubleshooting

**Extension not starting?**
- Check Output → Extension Host for errors
- Ensure port 3100 is available

**AI can't connect?**
- Run: `curl http://localhost:3100/health`
- Verify MCP client configuration

**Debugging tools not working?**
- Start a debug session first
- Check Debug Console for logs

---

## 📖 More Information

- [Remote Debugging Guide](docs/REMOTE_DEBUGGING.md)
- [Testing Guide](docs/TESTING.md)
- [Known Issues](docs/KNOWN_ISSUES.md)

---

## 📄 License

GPL-3.0-or-later

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) file for details.

**Happy debugging! 🚀**
