# 🐛 Bull Trigger - Debugging Guide

Quick debugging setup for VSCode development.

## 🚀 Quick Start

```bash
./debug.sh
```

Or use VSCode: `Ctrl+Shift+D` → Select configuration → `F5`

## 🔧 Debug Configurations

### Backend
- **Debug Backend**: TypeScript debugging with hot reload (port 9229)
- **Debug Backend (Migration)**: Includes database migration
- **Attach to Backend**: Connect to running process

### Frontend  
- **Debug Frontend**: Chrome with React DevTools (port 3001)

### Full Stack
- **Debug Full Stack**: Both backend + frontend simultaneously

### Testing
- **Debug Backend Tests**: Test debugging with breakpoints
- **Debug Frontend Tests**: React component test debugging

## 🎯 Common Debugging Scenarios

### Strategy Not Executing
**Check:**
- `backend/src/services/strategyFlowService.ts` - `executeStrategyFlow()`
- Strategy exists and is enabled
- Valid API request

### Telegram Issues  
**Check:**
- `backend/src/services/telegramService.ts` - `sendMessage()`
- Bot token and chat ID
- Bot permissions

### API Failures
**Check:**
- `frontend/src/services/websocketService.ts` - API methods
- Network tab in browser
- CORS settings

### OpenAI Integration
**Check:**
- `backend/src/llm/router.ts` - `callLLM()`
- API key in settings
- Token limits

## 🛠️ Environment Setup

### Required Variables
```bash
NODE_ENV=development
LOG_LEVEL=debug
OPENAI_API_KEY=your_key
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
```

### VSCode Extensions
Auto-recommended: TypeScript, Prettier, ESLint, Tailwind CSS, REST Client, SQLite Viewer

## 🚨 Troubleshooting

### Port Issues
```bash
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:3001 | xargs kill -9  # Frontend
```

### Build Issues
```bash
npm run build                  # Rebuild TypeScript
rm -rf node_modules && npm install  # Clean install
```

### Database Issues
```bash
npm run migrate                # Reset database
```

## ⌨️ Key Shortcuts

| Action | Key |
|--------|-----|
| Start/Continue | `F5` |
| Step Over | `F10` |
| Step Into | `F11` |
| Step Out | `Shift+F11` |
| Toggle Breakpoint | `F9` |
| Debug Console | `Ctrl+Shift+Y` |

## 💡 Tips

- Set breakpoints at function entry points
- Use Debug Console for runtime inspection  
- Check browser Network tab + backend logs
- Use SQLite viewer for database inspection

For more help, check the [main README](./README.md) or open an issue on GitHub. 