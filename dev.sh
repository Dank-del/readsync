#!/bin/bash

COMMAND=${1:-dev}

show_help() {
    echo "ReadSync Development Scripts"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev        Start both PocketBase and frontend (default)"
    echo "  pb         Start PocketBase server"
    echo "  frontend   Start frontend development server"
    echo "  build      Build frontend for production"
    echo "  stop       Stop PocketBase server"
    echo "  status     Show project status"
    echo "  clean      Clean build artifacts"
    exit 0
}

start_pocketbase() {
    echo "Starting PocketBase server..."
    ./pocketbase serve &
}

start_frontend() {
    echo "Starting frontend development server..."
    cd readsync-frontend && npm run dev
}

stop_pocketbase() {
    echo "Stopping PocketBase server..."
    pkill -f pocketbase
    if [ $? -eq 0 ]; then
        echo "PocketBase stopped"
    else
        echo "PocketBase not running"
    fi
}

show_status() {
    echo "=== ReadSync Status ==="
    [ -d "pb_data" ] && pb_data="Present" || pb_data="Missing"
    [ -d "readsync-frontend/node_modules" ] && node_modules="Installed" || node_modules="Missing"
    [ -d "pb_public/assets" ] && assets="Present" || assets="Missing"
    pgrep -f pocketbase > /dev/null && pb_running="Yes" || pb_running="No"

    echo "PocketBase data: $pb_data"
    echo "Frontend deps: $node_modules"
    echo "Built assets: $assets"
    echo "PocketBase running: $pb_running"
}

clean_build() {
    echo "Cleaning build artifacts..."
    rm -rf readsync-frontend/dist
    rm -rf pb_public/assets
    rm -rf readsync-frontend/node_modules/.vite
    echo "Clean complete!"
}

case $COMMAND in
    "dev")
        echo "Starting ReadSync development environment..."
        start_pocketbase
        sleep 2
        start_frontend
        ;;
    "pb")
        start_pocketbase
        ;;
    "frontend")
        start_frontend
        ;;
    "build")
        echo "Building frontend for production..."
        cd readsync-frontend && npm run build
        cd ..
        echo "Build complete! Files are in pb_public/"
        ;;
    "stop")
        stop_pocketbase
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_build
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo "Unknown command: $COMMAND"
        echo "Use 'help' for available commands"
        ;;
esac