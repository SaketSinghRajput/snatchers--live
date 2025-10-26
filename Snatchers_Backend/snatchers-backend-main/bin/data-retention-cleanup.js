#!/usr/bin/env node

/**
 * Data Retention Cleanup Script
 * 
 * This script performs periodic cleanup of expired data to comply with
 * data retention policies and GDPR requirements.
 * 
 * Usage:
 *   node bin/data-retention-cleanup.js
 *   
 * Environment Variables:
 *   DATA_RETENTION_DAYS - Number of days to retain data (default: 2555 = ~7 years)
 *   DRY_RUN - Set to 'true' to preview what would be deleted without actually deleting
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import GDPRService from '../services/GDPRService.js';
import AuditLogService from '../services/AuditLogService.js';

// Load environment variables
dotenv.config();

const DRY_RUN = process.env.DRY_RUN === 'true';
const DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '2555', 10);

async function main() {
  try {
    console.log('🧹 Starting data retention cleanup...');
    console.log(`📅 Retention period: ${DATA_RETENTION_DAYS} days`);
    console.log(`🔍 Dry run mode: ${DRY_RUN ? 'ON' : 'OFF'}`);
    
    // Connect to MongoDB
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is required');
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Log the cleanup start
    await AuditLogService.logEvent({
      action: 'data_retention_cleanup',
      resource: 'system',
      details: {
        retentionDays: DATA_RETENTION_DAYS,
        dryRun: DRY_RUN,
        startedAt: new Date().toISOString()
      },
      severity: 'low',
      source: 'system'
    });
    
    const results = {
      gdprCleanup: null,
      auditLogCleanup: null,
      errors: []
    };
    
    // 1. GDPR Service cleanup (expired analytics, notifications, etc.)
    try {
      console.log('\n📊 Running GDPR data cleanup...');
      results.gdprCleanup = await GDPRService.cleanupExpiredData();
      
      if (results.gdprCleanup.success) {
        console.log('✅ GDPR cleanup completed:');
        console.log(`   - Analytics records cleaned: ${results.gdprCleanup.cleanupLog.analyticsDeleted}`);
        console.log(`   - Notifications cleaned: ${results.gdprCleanup.cleanupLog.notificationsDeleted}`);
      } else {
        console.error('❌ GDPR cleanup failed');
        results.errors.push('GDPR cleanup failed');
      }
    } catch (error) {
      console.error('❌ GDPR cleanup error:', error.message);
      results.errors.push(`GDPR cleanup error: ${error.message}`);
    }
    
    // 2. Audit log cleanup
    try {
      console.log('\n📋 Running audit log cleanup...');
      results.auditLogCleanup = await AuditLogService.cleanupOldLogs(DATA_RETENTION_DAYS);
      
      if (results.auditLogCleanup.success) {
        console.log('✅ Audit log cleanup completed:');
        console.log(`   - Audit logs deleted: ${results.auditLogCleanup.deletedCount}`);
        console.log(`   - Cutoff date: ${results.auditLogCleanup.cutoffDate.toISOString()}`);
      } else {
        console.error('❌ Audit log cleanup failed');
        results.errors.push('Audit log cleanup failed');
      }
    } catch (error) {
      console.error('❌ Audit log cleanup error:', error.message);
      results.errors.push(`Audit log cleanup error: ${error.message}`);
    }
    
    // 3. Additional cleanup tasks can be added here
    // - Old session data
    // - Temporary files
    // - Expired tokens
    // - Old search analytics
    
    // Log the cleanup completion
    await AuditLogService.logEvent({
      action: 'data_retention_cleanup',
      resource: 'system',
      details: {
        retentionDays: DATA_RETENTION_DAYS,
        dryRun: DRY_RUN,
        completedAt: new Date().toISOString(),
        results: {
          gdprSuccess: results.gdprCleanup?.success || false,
          auditLogSuccess: results.auditLogCleanup?.success || false,
          errorCount: results.errors.length
        }
      },
      severity: results.errors.length > 0 ? 'medium' : 'low',
      status: results.errors.length > 0 ? 'failure' : 'success',
      source: 'system'
    });
    
    // Summary
    console.log('\n📋 Cleanup Summary:');
    console.log('==================');
    
    if (results.gdprCleanup?.success) {
      console.log(`✅ GDPR cleanup: ${results.gdprCleanup.cleanupLog.analyticsDeleted + results.gdprCleanup.cleanupLog.notificationsDeleted} records processed`);
    }
    
    if (results.auditLogCleanup?.success) {
      console.log(`✅ Audit logs: ${results.auditLogCleanup.deletedCount} records deleted`);
    }
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    console.log('\n🎉 Data retention cleanup completed!');
    
    // Exit with appropriate code
    process.exit(results.errors.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Fatal error during cleanup:', error);
    
    try {
      await AuditLogService.logEvent({
        action: 'data_retention_cleanup',
        resource: 'system',
        details: {
          error: error.message,
          stack: error.stack,
          failedAt: new Date().toISOString()
        },
        severity: 'critical',
        status: 'failure',
        source: 'system'
      });
    } catch (logError) {
      console.error('Failed to log cleanup error:', logError);
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, shutting down gracefully...');
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, shutting down gracefully...');
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
  }
  process.exit(0);
});

// Run the cleanup
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});