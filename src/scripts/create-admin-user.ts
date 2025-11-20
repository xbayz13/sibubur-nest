import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/user.entity';
import { Role } from '../entities/role.entity';
import { getDatabaseConfig } from '../config/database.config';
import * as readline from 'readline';

/**
 * Create Admin User Script
 * 
 * This script creates the first admin user (SuperAdmin) for the system.
 * It can only be run if no SuperAdmin user exists yet.
 * 
 * Usage:
 *   ADMIN_PASSWORD=your-password npm run create-admin
 *   or
 *   npm run create-admin (will prompt for password)
 */
async function createAdminUser() {
  const dbConfig = getDatabaseConfig();
  const dataSource = new DataSource({
    type: (dbConfig as any).type || 'postgres',
    host: (dbConfig as any).host,
    port: (dbConfig as any).port,
    username: (dbConfig as any).username,
    password: (dbConfig as any).password,
    database: (dbConfig as any).database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Check if SuperAdmin role exists
    const superAdminRole = await dataSource.getRepository(Role).findOne({
      where: { name: 'SuperAdmin' },
    });

    if (!superAdminRole) {
      console.error('❌ ERROR: SuperAdmin role does not exist!');
      console.error('   Please run: npm run seed:production');
      console.error('   This will create all necessary roles and permissions.');
      await dataSource.destroy();
      process.exit(1);
    }

    // Check if SuperAdmin user already exists
    const existingAdmin = await dataSource.getRepository(User).findOne({
      where: {
        roleId: superAdminRole.id,
      },
    });

    if (existingAdmin) {
      console.error('❌ ERROR: SuperAdmin user already exists!');
      console.error(`   Username: ${existingAdmin.username}`);
      console.error('   If you need to reset the password, use the API or update directly in database.');
      await dataSource.destroy();
      process.exit(1);
    }

    // Get password from environment or prompt
    let password = process.env.ADMIN_PASSWORD;

    if (!password) {
      console.log('⚠️  ADMIN_PASSWORD environment variable not set.');
      console.log('   You can set it with: ADMIN_PASSWORD=your-password npm run create-admin');
      console.log('   Or enter password below:\n');
      
      password = await promptPassword();
    }

    if (!password || password.length < 12) {
      console.error('❌ ERROR: Password must be at least 12 characters long!');
      await dataSource.destroy();
      process.exit(1);
    }

    // Get username (optional, defaults to 'admin')
    const username = process.env.ADMIN_USERNAME || 'admin';
    const name = process.env.ADMIN_NAME || 'Administrator';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = dataSource.getRepository(User).create({
      username,
      passwordHash: hashedPassword,
      name,
      roleId: superAdminRole.id,
      storeId: null, // SuperAdmin is not bound to any store
    });

    const savedUser = await dataSource.getRepository(User).save(adminUser);

    console.log('\n' + '='.repeat(60));
    console.log('✅ ADMIN USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📋 User Details:');
    console.log(`   Username: ${savedUser.username}`);
    console.log(`   Name: ${savedUser.name}`);
    console.log(`   Role: SuperAdmin (bypasses all permission checks)`);
    console.log(`   ID: ${savedUser.id}`);
    console.log('\n⚠️  SECURITY WARNING:');
    console.log('   • This user has FULL ACCESS to the system');
    console.log('   • Change the password immediately if it was set via environment variable');
    console.log('   • Store credentials securely');
    console.log('   • Never share SuperAdmin credentials');
    console.log('\n🚀 You can now login with this account!');
    console.log('='.repeat(60));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

/**
 * Prompt for password input (hidden)
 */
function promptPassword(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Hide password input
    process.stdout.write('Password (min 12 characters): ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';
    process.stdin.on('data', (char: string) => {
      char = char.toString();

      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          rl.close();
          console.log(''); // New line after password input
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace (Unix)
        case '\b': // Backspace (Windows)
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          // Only accept printable characters
          if (char >= ' ' && char <= '~') {
            password += char;
            process.stdout.write('*');
          }
          break;
      }
    });
  });
}

// Run the script
createAdminUser();

