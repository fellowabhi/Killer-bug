# Changelog

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
