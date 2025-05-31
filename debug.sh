#!/bin/bash

# Bull Trigger Debug Helper Script
# This script helps you quickly start debugging sessions

echo "🚀 Bull Trigger Debug Helper"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the Bull Trigger root directory"
    exit 1
fi

echo "1) Debug Backend Only"
echo "2) Debug Frontend Only" 
echo "3) Debug Full Stack (Backend + Frontend)"
echo "4) Attach to Running Backend"
echo "5) Run Backend with Inspector (manual attach)"
echo "6) Install Dependencies"
echo "7) Run Migrations"

read -p "Choose an option (1-7): " choice

case $choice in
    1)
        echo "🔧 Starting Backend Debug..."
        cd backend
        npm run migrate 2>/dev/null
        echo "Backend ready for debugging. Open VSCode and use '🚀 Debug Backend (Server)' launch config."
        ;;
    2)
        echo "🌐 Starting Frontend Debug..."
        cd frontend
        npm run dev &
        echo "Frontend dev server starting. Open VSCode and use '🌐 Debug Frontend (Chrome)' launch config."
        ;;
    3)
        echo "🚀 Starting Full Stack Debug..."
        echo "Start frontend dev server..."
        cd frontend
        npm run dev &
        cd ../backend
        npm run migrate 2>/dev/null
        echo "Full stack ready. Open VSCode and use '🚀 Debug Full Stack' compound launch config."
        ;;
    4)
        echo "🔍 Instructions for attaching to running backend:"
        echo "1. Make sure backend is running with --inspect flag"
        echo "2. Use '🔍 Attach to Backend (Running Process)' in VSCode"
        ;;
    5)
        echo "🔧 Starting Backend with Inspector..."
        cd backend
        npm run migrate 2>/dev/null
        echo "Starting backend with debugging enabled on port 9229..."
        node --inspect=9229 node_modules/.bin/tsx src/server.ts
        ;;
    6)
        echo "📦 Installing dependencies..."
        npm install
        cd backend && npm install
        cd ../frontend && npm install
        echo "✅ Dependencies installed!"
        ;;
    7)
        echo "🗄️ Running migrations..."
        cd backend
        npm run migrate
        echo "✅ Migrations completed!"
        ;;
    *)
        echo "❌ Invalid option. Please choose 1-7."
        exit 1
        ;;
esac

echo ""
echo "💡 Tips:"
echo "- Set breakpoints in your TypeScript files (.ts/.tsx)"
echo "- Use the VSCode debug console for runtime inspection"
echo "- Check the 'Debug' panel for variable inspection"
echo "- Frontend debugging works best with Chrome DevTools integration"
echo ""
echo "🔗 Quick VSCode Debug Launch Options:"
echo "  • Cmd+Shift+D (or Ctrl+Shift+D) to open Debug panel"
echo "  • F5 to start debugging with the selected configuration"
echo "  • F9 to toggle breakpoints"
echo "  • F10 to step over, F11 to step into"
echo ""
echo "📚 For detailed debugging guide, see: docs/DEBUG.md" 