import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

// Elasticsearch configuration
const elasticsearchConfig = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  } : undefined,
  requestTimeout: 30000,
  pingTimeout: 3000,
  maxRetries: 3
};

// Create Elasticsearch client
const client = new Client(elasticsearchConfig);

// Test connection
const testConnection = async () => {
  try {
    const health = await client.cluster.health();
    console.log('Elasticsearch connection successful:', health.cluster_name);
    return true;
  } catch (error) {
    console.warn('Elasticsearch connection failed:', error.message);
    console.warn('Search will fallback to MongoDB with Fuse.js');
    return false;
  }
};

export { client, testConnection };