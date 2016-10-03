'use strict';

var _Task = require('./lib/Task');

var _Task2 = _interopRequireDefault(_Task);

var _connection = require('./connection');

var _connection2 = _interopRequireDefault(_connection);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ silent: true });
} // eslint-disable-line global-require

function runTask() {
  (0, _connection2.default)(function (db) {
    var props = {
      kind: 'compilation-pages-pdf',
      compilationId: 'ryYp07yA'
    };

    var task = new _Task2.default(props);

    return task.start().then(function () {
      db.close();
    }).catch(function (err) {
      console.log(err);
    });
  });
}

runTask();