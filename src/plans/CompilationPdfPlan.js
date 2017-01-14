import _ from 'lodash';
import fs from 'fs';
import * as pdfHelper from '../lib/pdfHelper';
import * as fileHelper from '../lib/fileHelper';
import connection from '../connection';
import config from '../config';

const pageNumberingLatexPath = '/var/app/latex/pageNumbering.tex';
const gutterMarginLatexPath = '/var/app/latex/gutterMargin.tex';

class CompilationPdfPlan {
  constructor(props) {
    this.compilationId = props.compilationId;
    this.progress = props.progress || function () {}; // eslint-disable-line func-names
    this.log = props.log || function () {}; // eslint-disable-line func-names
    this.data = props;

    this.cleanupFiles = [];
    // stepsTotal should be the number of times this.step() is called within this.start()
    this.stepsTotal = 12;
    this.stepsCompleted = 0;

    this.getEmails = this.getEmails.bind(this);
    this.addEmailsProgressStepsToTotal = this.addEmailsProgressStepsToTotal.bind(this);
    this.getPages = this.getPages.bind(this);
    this.addPagesProgressStepsToTotal = this.addPagesProgressStepsToTotal.bind(this);
    this.downloadEmails = this.downloadEmails.bind(this);
    this.addPageNumberToEmail = this.addPageNumberToEmail.bind(this);
    this.downloadPages = this.downloadPages.bind(this);
    this.compilePdfDocuments = this.compilePdfDocuments.bind(this);
    this.offsetGutterMargins = this.offsetGutterMargins.bind(this);
    this.getCompilationPdfPages = this.getCompilationPdfPages.bind(this);
    this.savePdfResults = this.savePdfResults.bind(this);
    this.step = this.step.bind(this);
    this.cleanup = this.cleanup.bind(this);
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

    // Add steps to download pdf of each email
    this.stepsTotal += emailsCount;

    // Add steps to add page numbers to each email
    this.stepsTotal += emailsCount;
  }

  getPages() {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('pages');
        collection.find({ _compilation: this.compilationId, type: { $ne: 'cover' } })
        .toArray((err, docs) => { // eslint-disable-line consistent-return
          if (err) { return reject(err); }

          this.pages = docs;
          this.pagesPageCount = this.pages.map((page) => { return page.pdf.pageCount; }).reduce((a, b) => { return a + b; });
          this.addPagesProgressStepsToTotal();
          resolve(docs);
        });
      });
    });
  }

  addPagesProgressStepsToTotal() {
    const pagesCount = this.pages.length;

    // Add steps to download pdf of each email
    this.stepsTotal += pagesCount;
  }

  downloadEmails() {
    let p = Promise.resolve();

    _.forEach(this.emails, (email) => {
      p = p.then(() => {
        this.log(`Downloading email ${email._id} pdf`);

        return this.step(pdfHelper.downloadPdf(email.pdf)
        .then((localPath) => {
          this.cleanupFiles.push(localPath);
          email.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return this.addPageNumberToEmail(email);
        }));
      });
    });

    return p;
  }

  getFooterPositions() {
    // return 'CO,CE';
    if (this.pagesPageCount % 2 === 0) {
      return 'LE,RO';
    }
    return 'LO,RE';
  }

  addPageNumberToEmail(email) {
    this.log(`Adding page number email ${email._id}`);
    const pageNumberingLatex = fs.readFileSync(pageNumberingLatexPath, 'utf8').replace('\\\\', '\\');

    return this.step(new Promise((resolve, reject) => {
      const oldPath = email.pdf.localPath;
      const pathPieces = email.pdf.localPath.split('/');
      const oldFileName = pathPieces.pop();
      const newFileName = oldFileName.replace(/\.pdf$/, '-paged');
      const oldDir = pathPieces.join('/');
      // const newDir = '/var/host';
      const newDir = oldDir;
      const startingPage = this.data.emailPageMap[email._id];
      const emailLatex = pageNumberingLatex
      .replace('STARTING_PAGE', startingPage)
      .replace('FOOTER_POSITIONS', this.getFooterPositions(startingPage))
      .replace('PDF_PATH', oldPath)
      .replace('PDF_HEIGHT', config.height)
      .replace('PDF_WIDTH', config.width)
      .replace('LEFT_MARGIN', config.leftMargin)
      .replace('RIGHT_MARGIN', config.rightMargin);

      const spawn = require('child_process').spawn; // eslint-disable-line global-require


      const command = `echo "${emailLatex.replace('\\', '\\\\')}" | pdflatex -jobname="${newFileName}" -output-directory="${newDir}"`;
      const pdflatex = spawn('/bin/bash', [
        '-c',
        command,
      ]);

      // const pdflatex = spawn('pdflatex', [
      //   `-jobname="${newFileName}"`,
      //   `-output-directory="${newDir}"`,
      // ]);

      // pdflatex.stdin.write(emailLatex);
      // pdflatex.stdin.end();

      // pdflatex.stdout.on('data', (data) => {
      //   console.log(`\nstdout: ${data}`);
      // });
      //
      // pdflatex.stderr.on('data', (data) => {
      //   console.log(`\nstderr: ${data}`);
      // });

      pdflatex.on('close', (code) => {
        if (code === 0) {
          const newPath = [newDir, newFileName].join('/');
          this.cleanupFiles.push(`${newPath}.pdf`);
          this.cleanupFiles.push(`${newPath}.aux`);
          this.cleanupFiles.push(`${newPath}.log`);
          email.pdf.localPath = `${newPath}.pdf`; // eslint-disable-line no-param-reassign
          resolve(email);
        } else {
          reject('pdflatex returned a bad exit code.');
        }
      });
    }));
  }

  downloadPages() {
    let p = Promise.resolve();

    _.forEach(this.pages, (page) => {
      p = p.then(() => {
        this.log(`Downloading page ${page._id} pdf`);

        return this.step(pdfHelper.downloadPdf(page.pdf)
        .then((localPath) => {
          this.cleanupFiles.push(localPath);
          page.pdf.localPath = localPath; // eslint-disable-line no-param-reassign
          return Promise.resolve(page);
        }));
      });
    });

    return p;
  }

  compilePdfDocuments() {
    return new Promise((resolve, reject) => {
      const sortedEmails = _.sortBy(this.emails, (email) => { return this.data.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(this.pages, (page) => { return this.data.pagePositionMap[page._id]; });

      const pageFileArguments = _.map(sortedPages, (page) => { return page.pdf.localPath; });
      const emailFileArguments = _.map(sortedEmails, (email) => { return email.pdf.localPath; });

      const spawn = require('child_process').spawn; // eslint-disable-line global-require
      const pdftk = spawn('pdftk', [
        ...pageFileArguments,
        ...emailFileArguments,
        'cat',
        'output',
        '-',
      ]);

      const pdfBuffers = [];
      pdftk.stdout.on('data', (chunk) => { pdfBuffers.push(chunk); });
      pdftk.stdout.on('end', () => {
        resolve(Buffer.concat(pdfBuffers));
      });

      pdftk.stderr.on('data', (chunk) => {
        reject(chunk.toString('utf8'));
      });
    });
  }

  offsetGutterMargins(pdfObj) {
    this.log('Adding Gutter Margins');
    const gutterMarginLatex = fs.readFileSync(gutterMarginLatexPath, 'utf8').replace('\\\\', '\\');

    return this.step(new Promise((resolve, reject) => {
      const oldPath = pdfObj.localPath;
      const pathPieces = pdfObj.localPath.split('/');
      const oldFileName = pathPieces.pop();
      const newFileName = oldFileName.replace(/\.pdf$/, '-guttered');
      const oldDir = pathPieces.join('/');
      // const newDir = '/var/host';
      const newDir = oldDir;
      const gutterLatex = gutterMarginLatex
      .replace('GUTTER_MARGIN', config.gutterMarginOffset)
      .replace('GUTTER_MARGIN', config.gutterMarginOffset)
      .replace('PDF_PATH', oldPath)
      .replace('PDF_HEIGHT', config.height)
      .replace('PDF_WIDTH', config.width);

      const spawn = require('child_process').spawn; // eslint-disable-line global-require
      const command = `echo "${gutterLatex.replace('\\', '\\\\')}" | pdflatex -jobname="${newFileName}" -output-directory="${newDir}"`;
      const pdflatex = spawn('/bin/bash', [
        '-c',
        command,
      ]);

      // const pdflatex = spawn('pdflatex', [
      //   `-jobname="${newFileName}"`,
      //   `-output-directory="${newDir}"`,
      // ]);

      // pdflatex.stdin.write(emailLatex);
      // pdflatex.stdin.end();

      // pdflatex.stdout.on('data', (data) => {
      //   console.log(`\nstdout: ${data}`);
      // });
      //
      // pdflatex.stderr.on('data', (data) => {
      //   console.log(`\nstderr: ${data}`);
      // });

      pdflatex.on('close', (code) => {
        if (code === 0) {
          const newPath = [newDir, newFileName].join('/');
          this.cleanupFiles.push(`${newPath}.pdf`);
          this.cleanupFiles.push(`${newPath}.aux`);
          this.cleanupFiles.push(`${newPath}.log`);
          pdfObj.localPath = `${newPath}.pdf`; // eslint-disable-line no-param-reassign
          pdfObj.buffer = fs.readFileSync(pdfObj.localPath); // eslint-disable-line no-param-reassign
          resolve(pdfObj);
        } else {
          reject('pdflatex returned a bad exit code.');
        }
      });
    }));

    // this.log('Adding Gutter Margins');
    //
    // return pdfHelper.addGutterMargins(pdfObj, this.log);
  }

  savePdfObject(pdfObj) {
    return this.step(pdfHelper.savePdfObject(pdfObj))
    .then((localPath) => {
      pdfObj.localPath = localPath; // eslint-disable-line no-param-reassign
      return Promise.resolve(pdfObj);
    });
  }

  getCompilationPdfPages(buffer) {
    return pdfHelper.getPdfPages(buffer)
    .then((pageCount) => {
      return Promise.resolve({
        model: 'compilation',
        _id: this.compilationId,
        modelVersion: undefined,
        pageCount,
        buffer,
      });
    });
  }

  savePdfResults(pdfResults) {
    return new Promise((resolve, reject) => {
      connection((db) => {
        const collection = db.collection('compilations');
        collection.update(
        { _id: this.compilationId },
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

  cleanup() {
    return fileHelper.deleteFiles(this.cleanupFiles);
  }

  start() {
    return Promise.all([
      this.step(this.getEmails()),
      this.step(this.getPages()),
    ])
    .then(() => {
      return Promise.all([
        this.step(this.downloadEmails()),
        this.step(this.downloadPages()),
      ]);
    })
    .then(() => {
      return this.step(this.compilePdfDocuments());
    })
    .then((buffer) => {
      return this.step(this.getCompilationPdfPages(buffer));
    })
    .then((pdfObj) => {
      return this.step(this.savePdfObject(pdfObj));
    })
    .then((pdfObj) => {
      return this.step(this.offsetGutterMargins(pdfObj));
    })
    .then((pdfObj) => {
      return this.step(pdfHelper.uploadPdfObject(pdfObj));
    })
    .then((results) => {
      return this.step(this.savePdfResults(results));
    })
    .then(() => {
      return this.step(this.cleanup());
    })
    .catch((err) => {
      this.log(`blah error ${err.message}`, err);
    });
  }
}

export default CompilationPdfPlan;
