#!/usr/bin/env node

/**
 * Restore products from a backup MongoDB collection into the live `products` collection.
 *
 * Default backup collection: products_backup_null_product_id
 * Usage (PowerShell):
 *   node .\bin\restore-products-from-backup.js               # use default backup collection
 *   node .\bin\restore-products-from-backup.js other_backup  # specify custom collection name
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Load env
dotenv.config();

// Fallback to repo env if needed (same pattern as server.js)
try {
  if (!process.env.MONGO_URI) {
    const fallbackPath = path.resolve(process.cwd(), '../../deploy/snatchers-backend.env');
    if (fs.existsSync(fallbackPath)) {
      console.log(`Loading fallback env file: ${fallbackPath}`);
      dotenv.config({ path: fallbackPath });
    }
  }
} catch {}

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const BACKUP_COLLECTION = process.argv[2] || 'products_backup_null_product_id';

if (!MONGO_URI) {
  console.error('MONGO_URI is not set. Please configure it in .env or deploy/snatchers-backend.env');
  process.exit(1);
}

function toNumber(v, def = 0) {
  if (v === null || v === undefined || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function toSlug(text, suffix = '') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return suffix ? `${base}-${suffix}` : base;
}

let cachedVendorId = null;
async function getDefaultVendorId(preferred) {
  // 1) Use vendor from backup doc if it looks like a valid ObjectId
  try {
    if (preferred) {
      const idStr = String(preferred);
      if (mongoose.Types.ObjectId.isValid(idStr)) {
        return new mongoose.Types.ObjectId(idStr);
      }
    }
  } catch {}

  if (cachedVendorId) return cachedVendorId;
  // 2) Use any existing user id (admin preferred)
  let user = await User.findOne({ role: 'admin' }).select('_id');
  if (!user) user = await User.findOne({}).select('_id');
  if (user) {
    cachedVendorId = user._id;
    return cachedVendorId;
  }

  // 3) As a last resort, generate a placeholder ObjectId (no user record). This
  //    satisfies schema requirement without blocking the import.
  console.warn('[restore] No users found. Using placeholder vendor ObjectId.');
  cachedVendorId = new mongoose.Types.ObjectId();
  return cachedVendorId;
}

async function ensureUniqueSKU(baseSku) {
  const base = (baseSku || '').trim() || `SKU-BKP-${Date.now().toString(36).toUpperCase()}`;
  let sku = base;
  let counter = 1;
  while (await Product.exists({ sku })) {
    sku = `${base}-${(++counter).toString().padStart(2, '0')}`;
  }
  return sku;
}

async function ensureUniqueSlug(base, hintId) {
  let slug = base;
  let counter = 1;
  while (await Product.exists({ 'seo.slug': slug })) {
    slug = `${base}-${hintId || ''}${counter > 1 ? '-' + counter : ''}`.replace(/-+/g, '-');
    counter++;
  }
  return slug;
}

async function main() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const backup = db.collection(BACKUP_COLLECTION);
  const productsCol = db.collection('products');

  console.log(`Reading from backup collection: ${BACKUP_COLLECTION}`);

  const cursor = backup.find({});
  let scanned = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // We'll provide preferred vendor per-document when available
  const defaultVendorId = await getDefaultVendorId();

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    try {
      // Map fields from backup doc to Product schema
      const title = doc.title || doc.name || 'Untitled Product';
      const category = doc.category || doc.categoryName || 'Uncategorized';
      const brand = doc.brand || 'Generic';
      const price = toNumber(doc.price ?? doc.mrp ?? doc.amount, 0);
      const offerPrice = toNumber(doc.offerPrice ?? doc.discount_price ?? doc.salePrice ?? price, null);
      const images = Array.isArray(doc.images)
        ? doc.images.map(String)
        : doc.image
        ? [String(doc.image)]
        : [];
      const description = doc.description || doc.desc || '';
      const rating = toNumber(doc.rating ?? doc.averageRating, 0);
      const tags = Array.isArray(doc.tags)
        ? doc.tags
        : typeof doc.tags === 'string'
        ? doc.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      if (!title || !category || !brand || !Number.isFinite(price) || price <= 0) {
        skipped++;
        continue;
      }

      // Determine idempotent key to avoid duplicates: prefer SKU if present, else fallback by title+brand
      let skuCandidate = doc.sku || doc.SKU || doc.skuCode || null;
      if (skuCandidate) skuCandidate = String(skuCandidate).trim();

      // Upsert criteria
      let existing = null;
      if (skuCandidate) {
        existing = await productsCol.findOne({ sku: skuCandidate }, { projection: { _id: 1, sku: 1 } });
      }
      if (!existing) {
        existing = await productsCol.findOne({ title, brand }, { projection: { _id: 1, sku: 1 } });
      }

      // Build product payload
      const baseSlug = toSlug(title);
      const payload = {
        images,
        title,
        price,
        offerPrice: offerPrice && offerPrice > 0 ? offerPrice : null,
        rating,
        description,
        category,
        occasion: Array.isArray(doc.occasion) ? doc.occasion : [],
        sku: skuCandidate || undefined,
        brand,
        shortDescription: (doc.shortDescription || '').toString().slice(0, 160),
        specifications: Array.isArray(doc.specifications) ? doc.specifications : [],
        variants: Array.isArray(doc.variants) ? doc.variants : [],
        inventory: {
          quantity: toNumber(doc.quantity ?? doc.stock ?? 20, 20),
          lowStockThreshold: 10,
          trackInventory: true,
        },
        seo: {
          metaTitle: title,
          metaDescription: description ? String(description).slice(0, 160) : title,
          slug: baseSlug, // will be uniquified below if needed
          keywords: Array.isArray(doc.keywords)
            ? doc.keywords
            : typeof doc.keywords === 'string'
            ? doc.keywords.split(',').map(s => s.trim()).filter(Boolean)
            : [category, brand].filter(Boolean),
        },
        vendor: await getDefaultVendorId(doc.vendor || doc.vendorId || doc.userId),
        status: 'active',
        tags,
      };

      // Ensure unique sku/slug
      if (!payload.sku) payload.sku = await ensureUniqueSKU(toSlug(`${brand}-${title}`).toUpperCase());
      if (existing) {
        // Preserve existing SKU if present
        if (!existing.sku) {
          payload.sku = await ensureUniqueSKU(payload.sku);
        }
      } else {
        payload.sku = await ensureUniqueSKU(payload.sku);
      }

      payload.seo.slug = await ensureUniqueSlug(baseSlug, String(doc._id || 'bkp').slice(-6));

      // Ensure we comply with legacy unique index on product_id by setting a unique value
      const productIdField = doc.product_id || `BKP-${(doc._id || new mongoose.Types.ObjectId()).toString()}-${Date.now()}`;

      const toSave = {
        ...payload,
        product_id: productIdField,
      };

      if (existing) {
        await productsCol.updateOne({ _id: existing._id }, { $set: toSave });
        updated++;
      } else {
        await productsCol.insertOne(toSave);
        inserted++;
      }
    } catch (err) {
      skipped++;
      console.error(`Skip doc due to error: ${err.message}`);
    }
  }

  console.log(JSON.stringify({
    ok: true,
    backupCollection: BACKUP_COLLECTION,
    scanned,
    inserted,
    updated,
    skipped
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(2);
});
