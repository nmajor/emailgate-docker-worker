'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _connection = require('../connection');

var _connection2 = _interopRequireDefault(_connection);

var _pdfHelper = require('../lib/pdfHelper');

var pdfHelper = _interopRequireWildcard(_pdfHelper);

var _fileHelper = require('../lib/fileHelper');

var fileHelper = _interopRequireWildcard(_fileHelper);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CompilationCoverPdfPlan = function () {
  function CompilationCoverPdfPlan(options) {
    _classCallCheck(this, CompilationCoverPdfPlan);

    this.compilationId = options.compilationId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.log = options.log || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 4;
    this.stepsCompleted = 0;

    this.getCompilation = this.getCompilation.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  _createClass(CompilationCoverPdfPlan, [{
    key: 'getCompilation',
    value: function getCompilation() {
      var _this = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('compilations');
          collection.findOne({ _id: _this.compilationId }, function (err, doc) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }
            if (!doc) {
              return reject(new Error('No document found.'));
            }

            _this.compilation = doc;
            _this.cover = _this.compilation.cover;
            resolve(_this.compilation);
          });
        });
      });
    }
  }, {
    key: 'buildPdf',
    value: function buildPdf() {
      this.log('Building cover pdf');
      var cover = this.cover;
      cover._compilation = this.compilation._id;
      var html = cover.html;
      var coverOptions = _config2.default.coverOptions;

      // coverOptions.height = `${cover.height}mm`;
      // coverOptions.width = `${cover.width}mm`;

      var ratioModifier = 1.332;
      var heightPx = cover.height * 72 / 25.4 * ratioModifier;
      var widthPx = cover.width * 72 / 25.4 * ratioModifier;

      coverOptions.height = heightPx + 'px';
      coverOptions.width = widthPx + 'px';
      this.log('Cover options', coverOptions);
      return pdfHelper.buildPdf(html, 'cover', cover, coverOptions);
    }
  }, {
    key: 'chompPdf',
    value: function chompPdf(pdfObj) {
      var _this2 = this;

      var localPath = '/tmp/cover-' + pdfObj._id + '.pdf';

      return _fs2.default.writeFile(localPath, pdfObj.buffer).then(function () {
        return new Promise(function (resolve, reject) {
          var spawn = require('child_process').spawn; // eslint-disable-line global-require
          var pdftk = spawn('pdftk', [localPath, 'cat', '1', 'output', '-']);

          var pdfBuffers = [];
          pdftk.stdout.on('data', function (chunk) {
            pdfBuffers.push(chunk);
          });
          pdftk.stdout.on('end', function () {
            resolve(Buffer.concat(pdfBuffers));
          });

          pdftk.stderr.on('data', function (chunk) {
            reject(chunk.toString('utf8'));
          });
        });
      }).then(function (pdfBuffer) {
        return fileHelper.deleteFiles(_this2.cleanupFiles).then(function () {
          pdfObj.buffer = pdfBuffer; // eslint-disable-line no-param-reassign
          return Promise.resolve(pdfObj);
        });
      }).catch(function (err) {
        _this2.log('blah error happened', err.message);
      });
    }
  }, {
    key: 'uploadPdf',
    value: function uploadPdf(pdfObj) {
      this.log('Uploading cover pdf');
      return pdfHelper.uploadPdfObject(pdfObj, this.log);
    }
  }, {
    key: 'savePdfResults',
    value: function savePdfResults(pdfResults) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        (0, _connection2.default)(function (db) {
          var collection = db.collection('compilations');
          collection.update({ _id: _this3.compilationId }, { $set: { 'cover.pdf': pdfResults } }, function (err, result) {
            // eslint-disable-line consistent-return
            if (err) {
              return reject(err);
            }
            if (result.result.n !== 1) {
              return reject(new Error('No document updated.'));
            }

            resolve();
          });
        });
      });
    }
  }, {
    key: 'step',
    value: function step(stepPromise, data) {
      var _this4 = this;

      return stepPromise.then(function (result) {
        _this4.stepsCompleted += 1;
        _this4.progress(_this4.stepsCompleted, _this4.stepsTotal, data);

        return Promise.resolve(result);
      });
    }
  }, {
    key: 'start',
    value: function start() {
      var _this5 = this;

      return this.step(this.getCompilation()).then(function () {
        return _this5.step(_this5.buildPdf());
      }).then(function (pdfObj) {
        return _this5.step(_this5.chompPdf(pdfObj));
      }).then(function (pdfObj) {
        return _this5.step(_this5.uploadPdf(pdfObj));
      }).then(function (results) {
        return _this5.step(_this5.savePdfResults(results));
      });
    }
  }]);

  return CompilationCoverPdfPlan;
}();

exports.default = CompilationCoverPdfPlan;