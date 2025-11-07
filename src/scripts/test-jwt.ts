import jwt from 'jsonwebtoken';

// Test script to decode and verify JWT token
const token = process.argv[2];

if (!token) {
  console.log('Usage: npm run test:jwt <your-jwt-token>');
  console.log('Example: npm run test:jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

try {
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  console.log(`\n🔑 Using JWT_SECRET: ${secret ? '***' + secret.slice(-4) : 'NOT SET (using default)'}`);
  
  // Decode without verification first to see what's in it
  const decoded = jwt.decode(token, { complete: true });
  console.log('\n📋 Decoded JWT Token (without verification):');
  console.log(JSON.stringify(decoded, null, 2));
  
  // Check if token is expired
  if (decoded && typeof decoded === 'object' && 'payload' in decoded) {
    const payload = decoded.payload as any;
    if (payload.exp) {
      const expDate = new Date(payload.exp * 1000);
      const now = new Date();
      if (expDate < now) {
        console.log(`\n⏰ Token expired at: ${expDate.toISOString()}`);
        console.log(`   Current time: ${now.toISOString()}`);
        console.log('💡 Please login again to get a new token.');
        process.exit(0);
      } else {
        console.log(`\n⏰ Token expires at: ${expDate.toISOString()}`);
        console.log(`   Time remaining: ${Math.floor((expDate.getTime() - now.getTime()) / 1000 / 60)} minutes`);
      }
    }
    
    // Check roleName
    if (payload.roleName) {
      console.log(`\n✅ Role Name found in token: ${payload.roleName}`);
      if (payload.roleName === 'SuperAdmin') {
        console.log('✅ SuperAdmin role detected - should bypass all authorization!');
      }
    } else {
      console.log('\n⚠️  WARNING: roleName not found in token!');
      console.log('   You need to login again to get a new token with roleName.');
    }
  }
  
  // Now verify it
  console.log('\n🔍 Verifying token signature...');
  const verified = jwt.verify(token, secret);
  console.log('✅ Token signature is VALID!');
  console.log('\n✅ Verified JWT Token:');
  console.log(JSON.stringify(verified, null, 2));
  
} catch (error: any) {
  console.error('\n❌ Error verifying token:');
  console.error(error.message);
  
  if (error.message.includes('expired')) {
    console.log('\n💡 Token is expired. Please login again.');
  } else if (error.message.includes('invalid signature')) {
    console.log('\n💡 Token signature is invalid.');
    console.log('   This usually means:');
    console.log('   1. The token was signed with a different JWT_SECRET');
    console.log('   2. The JWT_SECRET in .env changed after token creation');
    console.log('   3. The token was created on a different server/environment');
    console.log('\n   Solution: Login again to get a new token with the current JWT_SECRET.');
  } else if (error.message.includes('jwt malformed')) {
    console.log('\n💡 Token is malformed. Make sure you copied the entire token.');
  }
}

