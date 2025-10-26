import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function checkUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/snatchers';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    const users = await User.find({})
      .select('email name uid role createdAt')
      .lean();

    console.log('========== USERS IN DATABASE ==========');
    console.log(`Total users: ${users.length}\n`);

    if (users.length > 0) {
      console.log('User List:');
      users.forEach((u, i) => {
        console.log(`${i + 1}. Email: ${u.email || 'N/A'}`);
        console.log(`   Name: ${u.name || 'N/A'}`);
        console.log(`   Role: ${u.role || 'user'}`);
        console.log(`   UID: ${u.uid}`);
        console.log(`   Created: ${u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('❌ No users found in the database.');
      console.log('\nTo create a user, you can:');
      console.log('1. Register through the frontend at /register');
      console.log('2. Use the API: POST /api/auth/register');
      console.log('   Body: { "email": "user@example.com", "password": "yourpassword", "name": "Your Name" }');
    }
    
    console.log('=======================================\n');

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
