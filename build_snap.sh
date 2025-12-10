#!/bin/bash
echo "Starting Snap Build..."

# Ensure we are in the project root
if [ ! -f "snapcraft.yaml" ]; then
    echo "Error: snapcraft.yaml not found. Please run this script from the project root."
    exit 1
fi

# Ensure binary exists
if [ ! -f "src-tauri/target/release/app" ]; then
    echo "Binary not found. Running tauri build first..."
    npm run tauri build
fi

echo "Running snapcraft..."
# Try running with sudo if standard fails, or warn user
snapcraft --destructive-mode

echo "Build complete (if no errors above)."
