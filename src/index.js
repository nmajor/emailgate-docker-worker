require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); } // eslint-disable-line global-require

import Task from './lib/Task';
import connection from './connection';
import sendLog from './lib/sendLog';

function parseTask(task) {
  const taskString = new Buffer(task, 'base64').toString('utf8');
  return JSON.parse(taskString);
}

function runTask() {
  sendLog('status', 'Inside running container.');
  connection((db) => {
    const props = parseTask(process.env.TASK);
    sendLog('status', JSON.stringify(props));
    const task = new Task(props);

    return task.start()
    .then(() => {
      db.close();
    })
    .catch((err) => {
      sendLog('error', err.message, err.stack);
    });
  });
}

runTask();
