import config from '../config';
import connection from '../connection';
import * as pdfHelper from '../lib/pdfHelper';
import * as fileHelper from '../lib/fileHelper';

class CompilationCoverPdfPlan {
  constructor(options) {
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

  getCompilation() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('compilations');
        collection.findOne({ _id: this.compilationId }, (err, doc) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }
          if (!doc) { return reject(new Error('No document found.')); }

          this.compilation = doc;
          this.cover = this.compilation.cover;
          resolve(this.compilation);
        });
      });
    });
  }

  buildPdf() {
    this.log('Building cover pdf');
    const cover = this.cover;
    cover._compilation = this.compilation._id;
    const html = cover.html;
    const coverOptions = config.coverOptions;

    // coverOptions.height = `${cover.height}mm`;
    // coverOptions.width = `${cover.width}mm`;

    const ratioModifier = 1.332;
    const heightPx = ((cover.height * 72) / 25.4) * ratioModifier;
    const widthPx = ((cover.width * 72) / 25.4) * ratioModifier;

    coverOptions.height = `${heightPx}px`;
    coverOptions.width = `${widthPx}px`;
    this.log('Cover options', coverOptions);
    return pdfHelper.buildPdf(html, 'cover', cover, coverOptions);
  }

  chompPdf(pdfObj) {
    const localPath = `/tmp/cover-${pdfObj._id}.pdf`;

    return fileHelper.saveFile(localPath, pdfObj.buffer)
    .then(() => {
      this.log('blah chomp 1');
      return new Promise((resolve, reject) => {
        this.log('blah chomp 2');
        const spawn = require('child_process').spawn; // eslint-disable-line global-require
        const pdftk = spawn('pdftk', [
          localPath,
          'cat',
          '1',
          'output',
          '-',
        ]);

        const pdfBuffers = [];
        pdftk.stdout.on('data', (chunk) => { pdfBuffers.push(chunk); });
        pdftk.stdout.on('end', () => {
          this.log('blah chomp end');
          resolve(Buffer.concat(pdfBuffers));
        });

        pdftk.stderr.on('data', (chunk) => {
          this.log('blah chomp data');
          reject(chunk.toString('utf8'));
        });
      });
    })
    .then((pdfBuffer) => {
      this.log('blah chomp after 1');
      return fileHelper.deleteFile(localPath)
      .then(() => {
        this.log('blah chomp after 2');
        pdfObj.buffer = pdfBuffer; // eslint-disable-line no-param-reassign
        return Promise.resolve(pdfObj);
      });
    })
    .catch((err) => { this.log('blah error happened', err.message); });
  }

  uploadPdf(pdfObj) {
    this.log('Uploading cover pdf');
    return pdfHelper.uploadPdfObject(pdfObj, this.log);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('compilations');
        collection.update(
        { _id: this.compilationId },
        { $set: { 'cover.pdf': pdfResults } },
        (err, result) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }
          if (result.result.n !== 1) { return reject(new Error('No document updated.')); }

          resolve();
        });
      });
    });
  }

  step(stepPromise, data) {
    return stepPromise.then((result) => {
      this.stepsCompleted += 1;
      this.progress(this.stepsCompleted, this.stepsTotal, data);

      return Promise.resolve(result);
    });
  }

  start() {
    return this.step(this.getCompilation())
    .then(() => {
      return this.step(this.buildPdf());
    })
    .then((pdfObj) => {
      return this.step(this.chompPdf(pdfObj));
    })
    .then((pdfObj) => {
      return this.step(this.uploadPdf(pdfObj));
    })
    .then((results) => {
      return this.step(this.savePdfResults(results));
    });
  }
}

export default CompilationCoverPdfPlan;
