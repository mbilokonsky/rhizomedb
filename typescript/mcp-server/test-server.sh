#!/bin/bash

# Simple test to verify the MCP server starts correctly
# This sends a basic MCP initialization request to the server

cd "$(dirname "$0")"

echo "Starting RhizomeDB MCP Server test..."
echo "This should show startup messages on stderr and respond to stdin"
echo ""

# Test with memory storage
export RHIZOME_STORAGE=memory
export RHIZOME_CACHE_SIZE=1000

# Start the server
echo "Running: node dist/index.js"
echo ""

# Note: In a real test, we'd send JSON-RPC messages via stdin
# For now, just verify it starts without errors
timeout 2s node dist/index.js <<EOF || true
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "0.1.0", "capabilities": {}}}
EOF

echo ""
echo "Test complete. If you saw startup messages above, the server is working!"
