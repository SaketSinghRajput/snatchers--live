#!/usr/bin/env node

/**
 * Migration script to add SEO-friendly slugs to existing products
 * Run with: npm run migrate:seo-slugs
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SEOService from '../services/SEOService.js';
import Product from '../models/Product.js';

// Load environment variables
dotenv.config();

async function migrateSEOSlugs() {
  try {
    console.log('🚀 Starting SEO slugs migration...');
    
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all products without SEO slugs
    const productsWithoutSlugs = await Product.find({
      $or: [
        { 'seo.slug': { $exists: false } },
        { 'seo.slug': null },
        { 'seo.slug': '' }
      ]
    });
    
    console.log(`📊 Found ${productsWithoutSlugs.length} products without SEO slugs`);
    
    if (productsWithoutSlugs.length === 0) {
      console.log('✅ All products already have SEO slugs');
      return;
    }
    
    // Update products in batches
    const batchSize = 10;
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (let i = 0; i < productsWithoutSlugs.length; i += batchSize) {
      const batch = productsWithoutSlugs.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(productsWithoutSlugs.length / batchSize)}`);
      
      for (const product of batch) {
        try {
          console.log(`  Processing: ${product.title} (${product._id})`);
          
          // Generate SEO slug
          const slug = SEOService.generateSlug(product.title, product._id.toString().slice(-6));
          
          // Check for duplicate slugs
          let finalSlug = slug;
          let counter = 1;
          
          while (true) {
            const existingProduct = await Product.findOne({ 
              'seo.slug': finalSlug,
              _id: { $ne: product._id }
            });
            
            if (!existingProduct) break;
            
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
          
          // Generate SEO meta data
          const metaTitle = `${product.title} - Buy Online at Best Price | Snatchers`;
          const metaDescription = `Buy ${product.title} online at the best price. ${product.brand ? `${product.brand} ` : ''}Free shipping and easy returns. Shop now at Snatchers.`;
          const keywords = [
            product.title.toLowerCase(),
            product.brand?.toLowerCase(),
            product.category?.toLowerCase(),
            'buy online',
            'best price',
            'free shipping'
          ].filter(Boolean);
          
          // Update product
          await Product.findByIdAndUpdate(product._id, {
            $set: {
              'seo.slug': finalSlug,
              'seo.metaTitle': metaTitle,
              'seo.metaDescription': metaDescription,
              'seo.keywords': keywords
            }
          });
          
          console.log(`    ✅ Updated with slug: ${finalSlug}`);
          successful++;
          
        } catch (error) {
          console.error(`    ❌ Failed to update ${product.title}:`, error.message);
          failed++;
        }
        
        processed++;
      }
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < productsWithoutSlugs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`  Total processed: ${processed}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('✅ SEO slugs migration completed successfully!');
    } else {
      console.log('⚠️ SEO slugs migration completed with some failures');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateSEOSlugs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export default migrateSEOSlugs;