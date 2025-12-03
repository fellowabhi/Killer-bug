# Changelog

## [0.2.0] - 2024-11-20

### Added - Remote Debugging Support

#### New Tools (3)
- `debug_listConfigs` - List all debug configurations from workspace's launch.json
- `debug_startWithConfig` - Start debugging using a named configuration from launch.json
- `debug_attach` - Attach to running process for remote debugging (FastAPI, Node.js, etc.)

#### Remote Debugging Capabilities
- Attach to running debugpy/Python processes
- Attach to running Node.js processes
- Use existing launch.json configurations
- Support for pathMappings (container/remote debugging)
- Dynamic port-based attachment

#### Use Cases Enabled
- **FastAPI Debugging**: AI can attach to running FastAPI server, set breakpoints, inspect requests
- **Node.js Debugging**: Attach to running Node.js apps with --inspect
- **Container Debugging**: Path mappings for Docker/remote environments
- **Config Reuse**: Leverage team's shared launch.json configurations

#### Documentation
- Complete REMOTE_DEBUGGING.md guide
- FastAPI workflow examples
- Node.js workflow examples
- launch.json configuration examples

### Tool Count
- Increased from 14 tools to **17 tools**
- Session Management: 3 → 6 tools

## [0.1.0] - 2024-11-20

### Added - Complete Feature Set

#### Session Management (3 tools)
- `debug_start` - Start debug session with auto-detected language support
- `debug_stop` - Stop active debug session
- `debug_getStatus` - Get current session state with execution position

#### Breakpoint Management (3 tools)
- `debug_setBreakpoint` - Set breakpoints with optional conditions
- `debug_removeBreakpoint` - Remove breakpoints
- `debug_listBreakpoints` - List all active breakpoints

#### Execution Control (5 tools)
- `debug_continue` - Continue to next breakpoint
- `debug_stepOver` - Step over current line
- `debug_stepInto` - Step into function calls
- `debug_stepOut` - Step out of current function
- `debug_pause` - Pause execution

#### Code Inspection (3 tools)
- `debug_getStackTrace` - Get complete call stack with frames
- `debug_getVariables` - Inspect variables in current scope
- `debug_evaluate` - Evaluate expressions in debug context

### Technical Implementation
- HTTP JSON-RPC transport on port 3100
- Event-driven state tracking (no polling)
- Auto-start on VS Code activation
- Debug Adapter Protocol (DAP) integration
- Support for Python, JavaScript, TypeScript, and more

### Architecture
- Extension runs in-process with VS Code
- HTTP server provides MCP endpoint
- Direct access to VS Code Debug API
- Clean separation: tools → handlers → VS Code APIs

### Documentation
- Complete README with features and usage
- Comprehensive TESTING.md with test prompts
- Technical Design Document (TDD.md)
- Example MCP configuration
- Troubleshooting guide

### Improvements Over Previous Version
- ✅ Fixed state tracking (was returning null values)
- ✅ Switched from SSE to HTTP JSON-RPC (more reliable)
- ✅ Added inspection tools (stack trace, variables, evaluate)
- ✅ Event-driven architecture (replaced polling)
- ✅ Better error handling and validation
- ✅ More comprehensive tool schemas

## Testing Status
- Built successfully with no TypeScript errors
- All 14 tools implemented and integrated
- Ready for end-to-end testing
- State tracking uses proper VS Code debug events

## Next Steps
1. Test all 14 tools in Extension Development Host
2. Verify state tracking with real debug sessions
3. Test inspection tools with paused debugger
4. Package for VS Code marketplace
5. Publish extension
