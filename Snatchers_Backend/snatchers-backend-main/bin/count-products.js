// Count total products in MongoDB
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Product from '../models/Product.js';

// Load env normally
dotenv.config();

// Fallback to repo deploy env file if MONGO_URI is not set
try {
  if (!process.env.MONGO_URI) {
    const fallbackPath = path.resolve(process.cwd(), '../../deploy/snatchers-backend.env');
    if (fs.existsSync(fallbackPath)) {
      console.log(`Loading fallback env file: ${fallbackPath}`);
      dotenv.config({ path: fallbackPath });
    }
  }
} catch {
  // ignore
}

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Please configure it in .env or deploy/snatchers-backend.env');
  process.exit(1);
}

async function main() {
  try {
    await mongoose.connect(MONGO_URI, {
      // Use modern defaults
      serverSelectionTimeoutMS: 8000,
    });

    const total = await Product.countDocuments({});
    const active = await Product.countDocuments({ status: 'active' });
    const inStock = await Product.countDocuments({
      $or: [
        { 'inventory.trackInventory': false },
        { 'inventory.quantity': { $gt: 0 } }
      ]
    });

    console.log(JSON.stringify({ ok: true, total, active, inStock }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exitCode = 2;
  } finally {
    try { await mongoose.disconnect(); } catch {}
  }
}

main();
