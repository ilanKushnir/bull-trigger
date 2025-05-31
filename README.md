# Bull Trigger

> Open-source crypto signal platform with AI-powered strategies

A self-hostable crypto trading signal generator that uses OpenAI models to analyze market conditions and send intelligent alerts to Telegram.

## 🚀 Features

- **AI-Powered Strategies**: OpenAI integration for market analysis and signal generation
- **Visual Strategy Builder**: Drag-and-drop flow editor for creating custom strategies
- **Telegram Integration**: Automated message delivery to channels/groups
- **Real-time Dashboard**: Modern React web interface for monitoring and control
- **Token Management**: Built-in usage tracking and limits
- **SQLite Database**: Self-contained, no external dependencies

## 📁 Project Structure

- `backend/` – API server (Node.js + TypeScript + Fastify)
- `frontend/` – Web dashboard (React + TypeScript + Vite + Tailwind)
- `docs/` – Documentation and guides
- `.vscode/` – VSCode debugging configuration

## 🚀 Quick Start

### Development
```bash
# Start backend (port 3000)
cd backend && npm install && npm run dev

# Start frontend (port 3001) 
cd frontend && npm install && npm run dev
```

### Production
```bash
make prod-up       # nginx on :80, api on :3000
```

### Self-Host with Docker
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your OpenAI API key and Telegram credentials

# 2. Start services
docker compose -f compose.prod.yml up -d
```

## 📚 Documentation

- **[📋 Product Requirements](docs/product-requirements.md)** - Complete feature specification
- **[🐛 Debugging Guide](docs/DEBUG.md)** - VSCode setup and troubleshooting
- **[🗄️ Database Schema](docs/database.md)** - Database structure and models
- **[⚙️ Strategy Builder](docs/strategies-builder.md)** - Visual flow editor guide

## 🤝 Contributing

- **[Contributing Guidelines](docs/CONTRIBUTING.md)** - How to contribute to the project
- **[Code of Conduct](docs/CODE_OF_CONDUCT.md)** - Community guidelines
- **[Changelog](docs/CHANGELOG.md)** - Release history and updates

## 🔧 Setup Guides

### Telegram Bot Setup
1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token and add it to your settings
4. Add the bot as admin to your channel/group
5. Get your channel ID (starts with `-100` for supergroups)

### OpenAI API Setup
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your system settings via the dashboard
3. Configure token limits and model preferences

## 🛠️ Development

### VSCode Debugging
The project includes complete VSCode debugging setup:
```bash
# Use the helper script
./debug.sh

# Or use VSCode debug panel (Cmd+Shift+D)
# - 🚀 Debug Backend (Server)
# - 🌐 Debug Frontend (Chrome)  
# - 🚀 Debug Full Stack
```

### Testing
```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test
```

## 📈 Live Demo

![Bull Trigger Dashboard](docs/demo.gif)

## 📄 License

MIT © 2024 Ilan Kushnir 