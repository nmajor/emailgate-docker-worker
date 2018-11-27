import config from '../config';
import connection from '../connection';
import * as pdfHelper from '../lib/pdfHelper';

class PagePdfPlan {
  constructor(options) {
    this.pageId = options.pageId;
    this.progress = options.progress || function () {}; // eslint-disable-line func-names
    this.log = options.log || function () {}; // eslint-disable-line func-names
    this.data = options.data || {};

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 5;
    this.stepsCompleted = 0;

    this.needsBlankPage = this.needsBlankPage.bind(this);
    this.getPage = this.getPage.bind(this);
    this.buildPdf = this.buildPdf.bind(this);
    this.addBlankPageIfNeeded = this.addBlankPageIfNeeded.bind(this);
    this.uploadPdf = this.uploadPdf.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  needsBlankPage(pdfObj) {
    if (this.page.type === 'title-page') { return true; }
    if (this.page.type === 'message-page' && pdfObj.pageCount % 2 !== 0) { return true; }
    if (this.page.type === 'full-image-page') { return true; }
    if (this.page.type === 'table-of-contents' && pdfObj.pageCount % 2 !== 0) { return true; }

    return false;
  }

  getPage() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.findOne({ _id: this.pageId }, (err, doc) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }
          if (!doc) { return reject(new Error('No document found.')); }

          this.page = doc;

          resolve(this.page);
        });
      });
    });
  }

  buildPdf() {
    this.log(`Building page ${this.page._id} pdf`);
    const page = this.page;
    const html = page.html;
    return pdfHelper.buildPdf(html, 'page', page, config.pageOptions);
  }

  addBlankPageIfNeeded(pdfObj) {
    if (this.needsBlankPage(pdfObj)) {
      return pdfHelper.appendBlankPage(pdfObj, this.log);
    }

    return Promise.resolve(pdfObj);
  }

  uploadPdf(pdfObj) {
    this.log(`Uploading page ${this.page._id} pdf`);
    return pdfHelper.uploadPdfObject(pdfObj, this.log);
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.update(
        { _id: this.pageId },
        { $set: { pdf: pdfResults } },
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
    return this.step(this.getPage())
    .then(() => {
      return this.step(this.buildPdf());
    })
    .then((pdfObj) => {
      return this.step(this.addBlankPageIfNeeded(pdfObj));
    })
    .then((pdfObj) => {
      return this.step(this.uploadPdf(pdfObj));
    })
    .then((results) => {
      return this.step(this.savePdfResults(results));
    });
  }
}

export default PagePdfPlan;
