#!/bin/bash
# Launch Chrome Beta with remote debugging for MCP server connection
# Usage: ./launch-chrome-beta.sh [--fresh]
#   --fresh: Use temporary profile (default: persistent profile)

CHROME_PATH="/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta"
PERSISTENT_PROFILE="$HOME/.tripweave-chrome-debug"
TEMP_PROFILE="/tmp/tripweave-debug-profile-$$"

# Check if Chrome Beta exists
if [ ! -f "$CHROME_PATH" ]; then
  echo "❌ Chrome Beta not found at: $CHROME_PATH"
  echo "   Install Chrome Beta from: https://www.google.com/chrome/beta/"
  exit 1
fi

# Check for --fresh flag
if [[ "$1" == "--fresh" ]]; then
  USER_DATA_DIR="$TEMP_PROFILE"
  echo "🧹 Using temporary profile (will be cleaned on close)"
else
  USER_DATA_DIR="$PERSISTENT_PROFILE"
  echo "💾 Using persistent profile at $PERSISTENT_PROFILE"
fi

echo "🚀 Launching Chrome Beta with remote debugging on port 9222..."

"$CHROME_PATH" \
  --remote-debugging-port=9222 \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  http://localhost:2000
