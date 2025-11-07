#!/bin/bash

echo "🧪 Testing SuperAdmin Login Flow"
echo "================================"
echo ""

# Check if server is running
echo "1️⃣  Checking if server is running..."
if curl -s http://localhost:3000/api > /dev/null 2>&1; then
  echo "   ✅ Server is running"
else
  echo "   ❌ Server is not running!"
  echo "   💡 Start the server: npm run start:dev"
  exit 1
fi

echo ""
echo "2️⃣  Logging in as SuperAdmin..."
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "superadmin",
    "password": "superadmin123"
  }')

TOKEN=$(echo "$RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "   ❌ Login failed!"
  echo "   Response: $RESPONSE"
  exit 1
fi

echo "   ✅ Login successful!"
echo "   Token: ${TOKEN:0:50}..."
echo ""

echo "3️⃣  Verifying token..."
npm run test:jwt "$TOKEN"
echo ""

echo "4️⃣  Testing protected endpoint..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/stores \
  -H "Authorization: Bearer $TOKEN")

if [ "$STATUS" = "200" ]; then
  echo "   ✅ Successfully accessed /stores endpoint!"
  echo "   ✅ SuperAdmin authorization is working!"
else
  echo "   ❌ Failed to access /stores endpoint"
  echo "   Status code: $STATUS"
  echo "   💡 Check server logs for details"
fi

echo ""
echo "✅ Test complete!"

