const { getMongoDb } = require('../config/mongo');

/**
 * Distributed Telemetry Logger:
 * Ingests queue events into MongoDB for high-throughput operational monitoring
 */
async function logQueueTelemetry(eventType, payload) {
  try {
    const db = getMongoDb();
    if (!db) return; // Fallback silently if Mongo is not connected
    
    const collection = db.collection('queue_event_stream');
    await collection.insertOne({
      event_type: eventType,
      ...payload,
      timestamp: new Date()
    });
  } catch (err) {
    // Non-blocking telemetry error
    console.debug('[Telemetry stream non-blocking error]:', err.message);
  }
}

module.exports = { logQueueTelemetry };
