'use strict';

var _Task = require('./lib/Task');

var _Task2 = _interopRequireDefault(_Task);

var _connection = require('./connection');

var _connection2 = _interopRequireDefault(_connection);

var _sendLog = require('./lib/sendLog');

var _sendLog2 = _interopRequireDefault(_sendLog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
} // eslint-disable-line global-require

function parseTask(task) {
  var taskString = new Buffer(task, 'base64').toString('utf8');
  return JSON.parse(taskString);
}

function runTask() {
  (0, _sendLog2.default)('status', 'Inside running container.');
  (0, _connection2.default)(function (db) {
    var props = parseTask(process.env.TASK);
    (0, _sendLog2.default)('status', JSON.stringify(props));
    var task = new _Task2.default(props);

    return task.start().then(function () {
      db.close();
    }).catch(function (err) {
      (0, _sendLog2.default)('error', err.message, err.stack);
    });
  });
}

runTask();