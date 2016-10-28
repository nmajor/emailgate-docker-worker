'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); // import config from '../config';

// import * as pdfHelper from '../lib/pdfHelper';


var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

var _PagePdfPlan = require('./PagePdfPlan');

var _PagePdfPlan2 = _interopRequireDefault(_PagePdfPlan);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CompilationPagesPdfPlan = function () {
  function CompilationPagesPdfPlan(props) {
    _classCallCheck(this, CompilationPagesPdfPlan);

    this.compilationId = props.compilationId;
    this.progress = props.progress || function () {}; // eslint-disable-line func-names
    this.log = props.log || function () {}; // eslint-disable-line func-names

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 2;
    this.stepsCompleted = 0;

    this.getPages = this.getPages.bind(this);
    this.addPagesProgressStepsToTotal = this.addPagesProgressStepsToTotal.bind(this);
    this.subProgress = this.subProgress.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(CompilationPagesPdfPlan, [{
    key: 'getPages',
    value: function getPages() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('pages');
          collection.find({ _compilation: _this.compilationId }).toArray(function (err, docs) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }

            _this.pages = docs;
            _this.addPagesProgressStepsToTotal();
            resolve(docs);
          });
        });
      });
    }
  }, {
    key: 'addPagesProgressStepsToTotal',
    value: function addPagesProgressStepsToTotal() {
      var pagesCount = this.pages.length;
      this.stepsTotal += pagesCount;
    }
  }, {
    key: 'subProgress',
    value: function subProgress() {
      return;
      // if (completed !== total) {
      //   const fraction = Number((completed / total).toFixed(2));
      //   this.progress(this.stepsCompleted + fraction, this.stepsTotal, data);
      // }
    }
  }, {
    key: 'pagePdfPlans',
    value: function pagePdfPlans() {
      var _this2 = this;

      var p = Promise.resolve();

      _lodash2.default.forEach(this.pages, function (page) {
        p = p.then(function () {
          var plan = new _PagePdfPlan2.default({ pageId: page._id, progress: _this2.subProgress, log: _this2.log });
          return _this2.step(plan.start());
        });
      });

      return p;
    }
  }, {
    key: 'step',
    value: function step(stepPromise, data) {
      var _this3 = this;

      return stepPromise.then(function (result) {
        _this3.stepsCompleted += 1;
        _this3.progress(_this3.stepsCompleted, _this3.stepsTotal, data);

        return Promise.resolve(result);
      });
    }
  }, {
    key: 'start',
    value: function start() {
      var _this4 = this;

      return this.step(this.getPages()).then(function () {
        return _this4.step(_this4.pagePdfPlans());
      });
    }
  }]);

  return CompilationPagesPdfPlan;
}();

exports.default = CompilationPagesPdfPlan;