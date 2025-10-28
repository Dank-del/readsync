param(
    [string]$Command = "dev",
    [switch]$Help
)

if ($Help) {
    Write-Host "ReadSync Development Scripts"
    Write-Host ""
    Write-Host "Usage: .\dev.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev        Start both PocketBase and frontend (default)"
    Write-Host "  pb         Start PocketBase server"
    Write-Host "  frontend   Start frontend development server"
    Write-Host "  build      Build frontend for production"
    Write-Host "  stop       Stop PocketBase server"
    Write-Host "  status     Show project status"
    Write-Host "  clean      Clean build artifacts"
    exit
}

function Start-PocketBase {
    Write-Host "Starting PocketBase server..."
    Start-Process -FilePath "pocketbase.exe" -ArgumentList "serve" -WindowStyle Normal
}

function Start-Frontend {
    Write-Host "Starting frontend development server..."
    Set-Location readsync-frontend
    npm run dev
}

function Stop-PocketBase {
    Write-Host "Stopping PocketBase server..."
    taskkill /f /im pocketbase.exe 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PocketBase stopped"
    } else {
        Write-Host "PocketBase not running"
    }
}

function Show-Status {
    Write-Host "=== ReadSync Status ==="
    $pbData = Test-Path "pb_data"
    $nodeModules = Test-Path "readsync-frontend\node_modules"
    $assets = Test-Path "pb_public\assets"
    $pbRunning = Get-Process -Name "pocketbase" -ErrorAction SilentlyContinue

    Write-Host "PocketBase data: $(if ($pbData) { "Present" } else { "Missing" })"
    Write-Host "Frontend deps: $(if ($nodeModules) { "Installed" } else { "Missing" })"
    Write-Host "Built assets: $(if ($assets) { "Present" } else { "Missing" })"
    Write-Host "PocketBase running: $(if ($pbRunning) { "Yes" } else { "No" })"
}

function Clean-Build {
    Write-Host "Cleaning build artifacts..."
    if (Test-Path "readsync-frontend\dist") { Remove-Item -Recurse -Force "readsync-frontend\dist" }
    if (Test-Path "pb_public\assets") { Remove-Item -Recurse -Force "pb_public\assets" }
    if (Test-Path "readsync-frontend\node_modules\.vite") { Remove-Item -Recurse -Force "readsync-frontend\node_modules\.vite" }
    Write-Host "Clean complete!"
}

switch ($Command) {
    "dev" {
        Write-Host "Starting ReadSync development environment..."
        Start-PocketBase
        Start-Sleep -Seconds 2
        Start-Frontend
    }
    "pb" { Start-PocketBase }
    "frontend" { Start-Frontend }
    "build" {
        Write-Host "Building frontend for production..."
        Set-Location readsync-frontend
        npm run build
        Set-Location ..
        Write-Host "Build complete! Files are in pb_public/"
    }
    "stop" { Stop-PocketBase }
    "status" { Show-Status }
    "clean" { Clean-Build }
    default {
        Write-Host "Unknown command: $Command"
        Write-Host "Use -Help for available commands"
    }
}