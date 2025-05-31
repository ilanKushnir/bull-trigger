# 🐛 Bull Trigger - Debugging Guide

This guide will help you set up and use debugging tools for the Bull Trigger project in VSCode.

## 🚀 Quick Start

### Option 1: Use the Debug Helper Script
```bash
./debug.sh
```

### Option 2: Use VSCode Launch Configurations
1. Open the project in VSCode
2. Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to open the Debug panel
3. Select a debug configuration from the dropdown
4. Press `F5` to start debugging

## 🔧 Available Debug Configurations

### Backend Debugging

#### 🚀 Debug Backend (Server)
- **What it does**: Starts the backend server with TypeScript debugging enabled
- **Best for**: Debugging API endpoints, strategy execution, database operations
- **Port**: Backend runs on port 3000, debugger on port 9229
- **Features**: 
  - TypeScript source maps
  - Hot reload on file changes
  - Full variable inspection

#### 🔧 Debug Backend (with Migration)
- **What it does**: Runs database migrations before starting the server
- **Best for**: Fresh start debugging with clean database state
- **Use when**: Database schema changes or starting from scratch

#### 🔍 Attach to Backend (Running Process)
- **What it does**: Attaches debugger to an already running backend process
- **Best for**: Debugging without restarting the server
- **Requirements**: Backend must be running with `--inspect` flag

### Frontend Debugging

#### 🌐 Debug Frontend (Chrome)
- **What it does**: Launches Chrome with debugging enabled for React app
- **Best for**: Debugging React components, state management, API calls
- **Port**: Frontend runs on port 3001
- **Features**:
  - React Developer Tools integration
  - Source maps for TypeScript
  - Network request debugging

### Full Stack Debugging

#### 🚀 Debug Full Stack (Backend + Frontend)
- **What it does**: Starts both backend and frontend with debugging enabled
- **Best for**: End-to-end debugging of user interactions
- **Components**: Backend server + React dev server + Chrome debugger

### Testing

#### 🧪 Debug Backend Tests
- **What it does**: Runs backend tests with debugging enabled
- **Best for**: Debugging failing tests, test logic

#### 🧪 Debug Frontend Tests  
- **What it does**: Runs frontend tests with debugging enabled
- **Best for**: Debugging React component tests

## 🛠️ Setting Breakpoints

### TypeScript/JavaScript Files
1. Open any `.ts` or `.tsx` file
2. Click in the gutter (left margin) next to line numbers
3. A red dot will appear indicating a breakpoint
4. Start debugging - execution will pause at breakpoints

### Example Breakpoint Locations

#### Backend Strategy Debugging
```typescript
// backend/src/services/strategyFlowService.ts
export async function executeStrategyFlow(strategyId: number) {
  console.log('🔍 Starting strategy execution'); // <- Set breakpoint here
  const strategy = await getStrategy(strategyId);
  // ...
}
```

#### Frontend API Call Debugging
```typescript
// frontend/src/services/websocketService.ts
async runStrategy(id: number): Promise<ApiResponse<{ ok: boolean }>> {
  console.log('🔍 Running strategy:', id); // <- Set breakpoint here
  return this.request<{ ok: boolean }>(`/api/strategies/${id}/run`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
```

## 🔍 Debug Console Usage

### Inspect Variables
When paused at a breakpoint:
- **Variables panel**: Shows all local variables and their values
- **Watch panel**: Add expressions to monitor continuously
- **Call Stack**: See the execution path that led to the breakpoint

### Console Commands
In the Debug Console, you can:
```javascript
// Check variable values
strategy
strategyId

// Execute functions
await api.getSettings()

// Modify variables (be careful!)
strategyId = 61
```

## 🎯 Common Debugging Scenarios

### 1. Strategy Not Executing
**Breakpoint locations:**
- `backend/src/services/strategyFlowService.ts` - `executeStrategyFlow()`
- `backend/src/server.ts` - POST `/api/strategies/:id/run` route

**What to check:**
- Strategy ID exists in database
- Strategy is enabled
- API request body is valid

### 2. Telegram Messages Not Sending
**Breakpoint locations:**
- `backend/src/services/telegramService.ts` - `sendMessage()`
- Strategy flow execution steps

**What to check:**
- Bot token is valid
- Chat ID is correct
- Bot has permissions in the channel

### 3. Frontend API Calls Failing
**Breakpoint locations:**
- `frontend/src/services/websocketService.ts` - API methods
- `frontend/src/pages/*.tsx` - Component event handlers

**What to check:**
- Network tab in browser dev tools
- API response status codes
- CORS settings

### 4. OpenAI Integration Issues
**Breakpoint locations:**
- `backend/src/llm/router.ts` - `callLLM()`
- `backend/src/services/strategyFlowService.ts` - Model call execution

**What to check:**
- API key is set in settings
- Model name is valid
- Token limits not exceeded

## 📋 Environment Setup

### Required VSCode Extensions
The project automatically recommends these extensions:
- **TypeScript**: Enhanced TypeScript support
- **Prettier**: Code formatting
- **ESLint**: Code linting
- **Tailwind CSS**: CSS class intellisense
- **REST Client**: API testing
- **SQLite Viewer**: Database inspection

### Environment Variables
Make sure these are set for debugging:
```bash
# Backend
NODE_ENV=development
LOG_LEVEL=debug

# OpenAI
OPENAI_API_KEY=your_api_key_here

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 🚨 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (backend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (frontend)  
lsof -ti:3001 | xargs kill -9
```

### TypeScript Compilation Errors
```bash
# Rebuild TypeScript files
cd backend && npm run build
cd frontend && npm run build
```

### Database Issues
```bash
# Reset database
cd backend && npm run migrate
```

### Node Modules Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 🔗 Useful Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Start Debugging | `F5` | `F5` |
| Step Over | `F10` | `F10` |
| Step Into | `F11` | `F11` |
| Step Out | `Shift+F11` | `Shift+F11` |
| Continue | `F5` | `F5` |
| Stop Debugging | `Shift+F5` | `Shift+F5` |
| Toggle Breakpoint | `F9` | `F9` |
| Debug Console | `Ctrl+Shift+Y` | `Cmd+Shift+Y` |

## 🎉 Happy Debugging!

Remember:
- Set breakpoints strategically at function entry points
- Use the Debug Console for runtime inspection
- Check both backend logs and browser network tab
- Don't forget to check the database with SQLite viewer

For more help, check the [main README](./README.md) or open an issue on GitHub. 