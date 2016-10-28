'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // import _ from 'lodash';

// import EmailPdfPlan from '../plans/EmailPdfPlan';
// import PagePdfPlan from '../plans/PagePdfPlan';


exports.planFactory = planFactory;

var _CompilationEmailsPdfPlan = require('../plans/CompilationEmailsPdfPlan');

var _CompilationEmailsPdfPlan2 = _interopRequireDefault(_CompilationEmailsPdfPlan);

var _CompilationPagesPdfPlan = require('../plans/CompilationPagesPdfPlan');

var _CompilationPagesPdfPlan2 = _interopRequireDefault(_CompilationPagesPdfPlan);

var _CompilationCoverPdfPlan = require('../plans/CompilationCoverPdfPlan');

var _CompilationCoverPdfPlan2 = _interopRequireDefault(_CompilationCoverPdfPlan);

var _CompilationPdfPlan = require('../plans/CompilationPdfPlan');

var _CompilationPdfPlan2 = _interopRequireDefault(_CompilationPdfPlan);

var _sendLog = require('./sendLog');

var _sendLog2 = _interopRequireDefault(_sendLog);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function planFactory(task) {
  switch (task.props.kind) {
    case 'compilation-emails-pdf':
      return new _CompilationEmailsPdfPlan2.default(task.props, task.progress);
    case 'compilation-pages-pdf':
      return new _CompilationPagesPdfPlan2.default(task.props, task.progress);
    case 'compilation-cover-pdf':
      return new _CompilationCoverPdfPlan2.default(task.props, task.progress);
    case 'compilation-pdf':
      return new _CompilationPdfPlan2.default(task.props, task.progress);
    default:
      return null;
  }
}

var Task = function () {
  function Task(props) {
    _classCallCheck(this, Task);

    this.props = props;
    this.props.progress = this.progress.bind(this);
    this.props.log = this.log.bind(this);
  }

  _createClass(Task, [{
    key: 'log',
    value: function log(entry, payload) {
      (0, _sendLog2.default)('update', entry, payload);
    }
  }, {
    key: 'progress',
    value: function progress(completed, total, data) {
      var percent = parseInt(Number((completed / total).toFixed(2)) * 100, 10);
      (0, _sendLog2.default)('progress', percent + '%', { completed: completed, total: total, data: data });
    }
  }, {
    key: 'start',
    value: function start() {
      (0, _sendLog2.default)('status', 'Starting ' + this.props.kind + ' task.');
      return planFactory(this).start();
    }
  }]);

  return Task;
}();

exports.default = Task;