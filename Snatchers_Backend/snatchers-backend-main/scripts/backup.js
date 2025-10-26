#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Created backup directory');
    }
  }

  async backupDatabase() {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️ MONGO_URI not found, skipping database backup');
      return null;
    }

    console.log('📦 Starting database backup...');
    
    try {
      // Parse MongoDB URI to extract database name
      const mongoUri = new URL(process.env.MONGO_URI);
      const dbName = mongoUri.pathname.slice(1) || 'snatchers';
      
      const backupPath = path.join(this.backupDir, `db-backup-${this.timestamp}`);
      
      // Use mongodump to create backup
      const command = `mongodump --uri="${process.env.MONGO_URI}" --out="${backupPath}"`;
      
      await execAsync(command);
      
      // Compress the backup
      const tarPath = `${backupPath}.tar.gz`;
      await execAsync(`tar -czf "${tarPath}" -C "${this.backupDir}" "db-backup-${this.timestamp}"`);
      
      // Remove uncompressed backup
      await execAsync(`rm -rf "${backupPath}"`);
      
      console.log(`✅ Database backup created: ${tarPath}`);
      return tarPath;
    } catch (error) {
      console.error('❌ Database backup failed:', error.message);
      return null;
    }
  }

  async backupFiles() {
    console.log('📁 Starting file backup...');
    
    try {
      const filesToBackup = [
        'uploads',
        'logs',
        '.env',
        'package.json',
        'package-lock.json'
      ];
      
      const existingFiles = filesToBackup.filter(file => 
        fs.existsSync(path.join(process.cwd(), file))
      );
      
      if (existingFiles.length === 0) {
        console.warn('⚠️ No files to backup');
        return null;
      }
      
      const backupPath = path.join(this.backupDir, `files-backup-${this.timestamp}.tar.gz`);
      const filesStr = existingFiles.join(' ');
      
      await execAsync(`tar -czf "${backupPath}" ${filesStr}`);
      
      console.log(`✅ File backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ File backup failed:', error.message);
      return null;
    }
  }

  async backupConfiguration() {
    console.log('⚙️ Starting configuration backup...');
    
    try {
      const config = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        packageInfo: JSON.parse(fs.readFileSync('package.json', 'utf8')),
        environmentVariables: Object.keys(process.env).filter(key => 
          key.startsWith('MONGO_') || 
          key.startsWith('COGNITO_') || 
          key.startsWith('FRONTEND_') ||
          key.startsWith('SESSION_') ||
          key === 'NODE_ENV' ||
          key === 'PORT'
        ).reduce((obj, key) => {
          // Don't include sensitive values, just indicate they exist
          obj[key] = process.env[key] ? '[CONFIGURED]' : '[NOT_SET]';
          return obj;
        }, {})
      };
      
      const configPath = path.join(this.backupDir, `config-backup-${this.timestamp}.json`);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log(`✅ Configuration backup created: ${configPath}`);
      return configPath;
    } catch (error) {
      console.error('❌ Configuration backup failed:', error.message);
      return null;
    }
  }

  async cleanupOldBackups(keepCount = 10) {
    console.log('🧹 Cleaning up old backups...');
    
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('backup-'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);
      
      if (files.length > keepCount) {
        const filesToDelete = files.slice(keepCount);
        
        for (const file of filesToDelete) {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        }
        
        console.log(`✅ Cleaned up ${filesToDelete.length} old backups`);
      } else {
        console.log('✅ No old backups to clean up');
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  async createFullBackup() {
    console.log('🚀 Starting full backup process...');
    console.log(`📅 Timestamp: ${this.timestamp}`);
    
    await this.ensureBackupDirectory();
    
    const results = {
      database: await this.backupDatabase(),
      files: await this.backupFiles(),
      configuration: await this.backupConfiguration()
    };
    
    // Create backup manifest
    const manifest = {
      timestamp: this.timestamp,
      backups: results,
      success: Object.values(results).some(result => result !== null)
    };
    
    const manifestPath = path.join(this.backupDir, `backup-manifest-${this.timestamp}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`📋 Backup manifest created: ${manifestPath}`);
    
    // Cleanup old backups
    await this.cleanupOldBackups();
    
    if (manifest.success) {
      console.log('🎉 Backup process completed successfully!');
      console.log('\n📊 Backup Summary:');
      console.log(`   Database: ${results.database ? '✅' : '❌'}`);
      console.log(`   Files: ${results.files ? '✅' : '❌'}`);
      console.log(`   Configuration: ${results.configuration ? '✅' : '❌'}`);
      console.log(`   Manifest: ✅`);
    } else {
      console.log('⚠️ Backup process completed with some failures');
      process.exit(1);
    }
  }
}

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const backup = new BackupService();
  backup.createFullBackup().catch(error => {
    console.error('❌ Backup process failed:', error);
    process.exit(1);
  });
}

export default BackupService;