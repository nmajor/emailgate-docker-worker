// import config from '../config';
import connection from '../connection';
// import * as pdfHelper from '../lib/pdfHelper';
import EmailPdfPlan from './EmailPdfPlan';
import _ from 'lodash';

class CompilationEmailsPdfPlan {
  constructor(props) {
    this.compilationId = props.compilationId;
    this.progress = props.progress || function () {}; // eslint-disable-line func-names
    this.log = props.log || function () {}; // eslint-disable-line func-names

    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 2;
    this.stepsCompleted = 0;

    this.getEmails = this.getEmails.bind(this);
    this.addEmailsProgressStepsToTotal = this.addEmailsProgressStepsToTotal.bind(this);
    this.subProgress = this.subProgress.bind(this);
    this.step = this.step.bind(this);
    this.start = this.start.bind(this);
  }

  getEmails() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('emails');
        collection.find({ _compilation: this.compilationId })
        .toArray((err, docs) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }

          this.emails = docs;
          this.addEmailsProgressStepsToTotal();
          resolve();
        });
      });
    });
  }

  addEmailsProgressStepsToTotal() {
    const emailsCount = this.emails.length;
    this.stepsTotal += emailsCount;
  }
  subProgress() {
    return;
    // if (completed !== total) {
    //   const fraction = Number((completed / total).toFixed(2));
    //   this.progress(this.stepsCompleted + fraction, this.stepsTotal, data);
    // }
  }
  emailPdfPlans() {
    let p = Promise.resolve();

    _.forEach(this.emails, (email) => {
      p = p.then(() => {
        const plan = new EmailPdfPlan({ emailId: email._id, progress: this.subProgress, log: this.log });
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
    return this.step(this.getEmails())
    .then(() => {
      return this.step(this.emailPdfPlans());
    });
  }
}

export default CompilationEmailsPdfPlan;
