const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGO_DB_NAME || 'healthcare_telemetry';

let db = null;
let client = null;

async function connectMongo() {
  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 3000 });
    await client.connect();
    db = client.db(dbName);
    console.log(`[Mongo Telemetry] Connected to MongoDB (${dbName}) for distributed telemetry streaming`);
  } catch (error) {
    console.warn(`[Mongo Telemetry] MongoDB not available (${error.message}). Distributed telemetry will fallback to MySQL only.`);
    db = null;
  }
}

function getMongoDb() {
  return db;
}

module.exports = { connectMongo, getMongoDb };
