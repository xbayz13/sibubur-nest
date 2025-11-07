#!/bin/bash

# Quick login script to get a new token
echo "🔐 Logging in as SuperAdmin..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123"
  }')

echo "$RESPONSE" | jq '.'

TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo ""
  echo "✅ Login successful!"
  echo ""
  echo "📋 Your access token:"
  echo "$TOKEN"
  echo ""
  echo "🧪 Testing token..."
  npm run test:jwt "$TOKEN"
  echo ""
  echo "💡 Use this token in your requests:"
  echo "   Authorization: Bearer $TOKEN"
else
  echo ""
  echo "❌ Login failed!"
  echo "Response: $RESPONSE"
fi

