if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); }
import { MongoClient } from 'mongodb';
import config from './config';
import sendLog from './lib/sendLog';

let db = null;

export default function (cb) {
  if (db) { cb(db); return; }

  sendLog('status', `MongoURL: ${config.mongoUrl}`);

  MongoClient.connect(config.mongoUrl, (err, conn) => {
    if (err) { return sendLog('error', `There was a problem connecting to the database ${err.message}`, err); }
    sendLog('status', 'Connected to db');

    db = conn;
    return cb(db);
  });
}
