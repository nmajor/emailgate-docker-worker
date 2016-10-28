'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (cb) {
  if (db) {
    cb(db);return;
  }

  (0, _sendLog2.default)('status', 'MongoURL: ' + _config2.default.mongoUrl);

  _mongodb.MongoClient.connect(_config2.default.mongoUrl, function (err, conn) {
    if (err) {
      return (0, _sendLog2.default)('error', 'There was a problem connecting to the database ' + err.message, err);
    }
    (0, _sendLog2.default)('status', 'Connected to db');

    db = conn;
    return cb(db);
  });
};

var _mongodb = require('mongodb');

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _sendLog = require('./lib/sendLog');

var _sendLog2 = _interopRequireDefault(_sendLog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
}


var db = null;