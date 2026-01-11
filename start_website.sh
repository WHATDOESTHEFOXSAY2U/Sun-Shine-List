#!/bin/bash
# Start the Sunshine List website

echo "🌞 Starting Sunshine List Explorer..."
echo ""
echo "Open your browser to: http://localhost:8080/website/index.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8080
