// import config from '../config';
import connection from '../connection';
// import * as pdfHelper from '../lib/pdfHelper';
import PagePdfPlan from './PagePdfPlan';
import _ from 'lodash';

class CompilationPagesPdfPlan {
  constructor(props, progress) {
    this.compilationId = props.compilationId;
    this.progress = progress || function () {}; // eslint-disable-line func-names

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 2;
    this.stepsCompleted = 0;

    this.getPages = this.getPages.bind(this);
    this.addPagesProgressStepsToTotal = this.addPagesProgressStepsToTotal.bind(this);
    this.subProgress = this.subProgress.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  getPages() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.find({ _compilation: this.compilationId })
        .toArray((err, docs) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }

          this.pages = docs;
          this.addPagesProgressStepsToTotal();
          resolve(docs);
        });
      });
    });
  }

  addPagesProgressStepsToTotal() {
    const pagesCount = this.pages.length;
    this.stepsTotal += pagesCount;
  }

  subProgress(completed, total, data) {
    if (completed !== total) {
      const fraction = Number((completed / total).toFixed(2));
      this.progress(this.stepsCompleted + fraction, this.stepsTotal, data);
    }
  }
  pagePdfPlans() {
    let p = Promise.resolve();

    _.forEach(this.pages, (page) => {
      p = p.then(() => {
        const plan = new PagePdfPlan({ pageId: page._id, progress: this.subProgress });
        return this.step(plan.start());
      });
    });

    return p;
  }

  step(stepPromise, data) {
    return stepPromise.then((result) => {
      this.stepsCompleted += 1;
      this.progress(this.stepsCompleted, this.stepsTotal, data);

      return Promise.resolve(result);
    });
  }

  start() {
    return this.step(this.getPages())
    .then(() => {
      return this.step(this.pagePdfPlans());
    });
  }
}

export default CompilationPagesPdfPlan;
