import { config } from 'dotenv';

config();

// Verify JWT_SECRET is loaded correctly
const jwtSecret = process.env.JWT_SECRET;

console.log('\n🔍 Checking JWT_SECRET configuration...\n');

if (!jwtSecret) {
  console.log('❌ JWT_SECRET is not set in .env file!');
  console.log('   Using default: your-secret-key-change-in-production');
  console.log('\n💡 Add JWT_SECRET to your .env file:');
  console.log('   JWT_SECRET=your-secret-key-here');
  process.exit(1);
}

console.log(`✅ JWT_SECRET is set: ***${jwtSecret.slice(-4)}`);
console.log(`   Length: ${jwtSecret.length} characters`);
console.log(`   Full secret: ${jwtSecret}\n`);

// Test token creation and verification
import jwt from 'jsonwebtoken';

const testPayload = {
  username: 'test',
  sub: 1,
  roleId: 1,
  roleName: 'Test',
};

try {
  // Create a test token
  const token = jwt.sign(testPayload, jwtSecret, { expiresIn: '1h' });
  console.log('✅ Token creation successful');
  console.log(`   Test token: ${token.substring(0, 50)}...\n`);

  // Verify the token
  const verified = jwt.verify(token, jwtSecret);
  console.log('✅ Token verification successful');
  console.log(`   Verified payload:`, verified);
  console.log('\n✅ JWT_SECRET is working correctly!\n');
} catch (error: any) {
  console.error('❌ Error testing JWT_SECRET:');
  console.error(error.message);
  process.exit(1);
}

