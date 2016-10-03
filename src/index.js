require('babel-register');
require('babel-polyfill');
if (process.env.NODE_ENV !== 'production') { require('dotenv').config({ silent: true }); } // eslint-disable-line global-require

import Task from './lib/Task';
import connection from './connection';

function runTask() {
  connection((db) => {
    const props = {
      kind: 'compilation-pages-pdf',
      compilationId: 'ryYp07yA',
    };

    const task = new Task(props);

    return task.start()
    .then(() => {
      db.close();
    })
    .catch((err) => {
      console.log(err);
    });
  });
}

runTask();
