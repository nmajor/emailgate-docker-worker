import _ from 'lodash';
import fs from 'fs';
import * as pdfHelper from '../lib/pdfHelper';
import * as fileHelper from '../lib/fileHelper';
import connection from '../connection';
import config from '../config';

const pageNumberingLatexPath = '/var/app/latex/pageNumbering.tex';
const gutterMarginLatexPath = '/var/app/latex/gutterMargin.tex';
const logFile = '/tmp/stdout.log';

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

    _.forEach(this.emails, (email, index) => {
      p = p.then(() => {
        this.log(`Downloading yoda email ${email._id} pdf ${index + 1} of ${this.emails.length}`);

        return this.step(pdfHelper.downloadPdf({ ...email.pdf, filename: `email-${email._id}.pdf` })
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
    const pageNumberingLatex = fs.readFileSync(pageNumberingLatexPath, 'utf8');
    this.log('blah 1');

    return this.step(new Promise((resolve, reject) => {
      this.log('blah 2', email.pdf.localPath);
      const oldPath = email.pdf.localPath;
      const pathPieces = email.pdf.localPath.split('/');
      const oldFileName = pathPieces.pop();
      const newFileName = oldFileName.replace(/\.pdf$/, '-paged');
      const oldDir = pathPieces.join('/');
      // const newDir = '/var/host';
      const newDir = oldDir;
      const texName = oldFileName.replace(/\.pdf$/, '-page-numbering.tex');
      const texPath = [newDir, texName].join('/');
      const startingPage = this.data.emailPageMap[email._id];

      this.log(`blah 10 ${startingPage}`);
      this.log(`blah 11 ${this.getFooterPositions(startingPage)}`);
      this.log(`blah 11 ${oldPath}`);
      this.log(`blah 11 ${config.height}`);
      this.log(`blah 11 ${config.width}`);
      this.log(`blah 11 ${config.leftMargin}`);
      this.log(`blah 11 ${config.rightMargin}`);

      const emailLatex = pageNumberingLatex
      .replace('STARTING_PAGE', startingPage)
      .replace('FOOTER_POSITIONS', this.getFooterPositions(startingPage))
      .replace('PDF_PATH', oldPath)
      .replace('PDF_HEIGHT', config.height)
      .replace('PDF_WIDTH', config.width)
      .replace('LEFT_MARGIN', config.leftMargin)
      .replace('RIGHT_MARGIN', config.rightMargin);
      this.log('blah 3 emailLatex', emailLatex);
      this.log('blah texPath', texPath);

      this.log('page number Pre File Write');
      fs.writeFile(texPath, emailLatex, (err) => {
        this.log('page number Post File Write 1');
        if (err) { return reject(err); }
        this.log('page number Post File Write 2');

        const spawn = require('child_process').spawn; // eslint-disable-line global-require

        const command = `pdflatex -jobname="${newFileName}" -output-directory="${newDir}" ${texPath}`;
        this.log('blah hey command', command);

        const pdflatex = spawn('/bin/bash', [
          '-c',
          command,
        ]);

        pdflatex.stdout.on('data', (data) => {
          fs.appendFileSync(logFile, data);
        });

        pdflatex.on('error', (data) => {
          this.log('err happened', { data });
        });

        pdflatex.on('disconnect', (data) => {
          this.log('disconnect happened', { data });
        });

        pdflatex.stderr.on('data', (data) => {
          this.log(`Error: ${data}`);
        });

        pdflatex.on('close', (code) => {
          this.log('blah 3');
          if (code === 0) {
            this.log('blah 40');
            const newPath = [newDir, newFileName].join('/');
            this.log('blah 41');
            this.cleanupFiles.push(`${newPath}.pdf`);
            this.log('blah 42');
            this.cleanupFiles.push(`${newPath}.aux`);
            this.log('blah 43');
            this.cleanupFiles.push(`${newPath}.log`);
            this.log('blah 44');
            email.pdf.localPath = `${newPath}.pdf`; // eslint-disable-line no-param-reassign
            this.log('blah 45');
            resolve(email);
          } else {
            this.log('blah 5');
            reject('pdflatex returned a bad exit code.');
          }
        });

        pdflatex.on('exit', (code) => {
          this.log(`blah ho ho ho 3 ${code}`);
          if (code === 0) {
            this.log('blah ho ho ho 4');
            const newPath = [newDir, newFileName].join('/');
            this.cleanupFiles.push(`${newPath}.pdf`);
            this.cleanupFiles.push(`${newPath}.aux`);
            this.cleanupFiles.push(`${newPath}.log`);
            email.pdf.localPath = `${newPath}.pdf`; // eslint-disable-line no-param-reassign
            resolve(email);
          } else {
            this.log('blah 5');
            reject('pdflatex returned a bad exit code.');
          }
        });

        return null;
      });
    }).catch((err) => {
      this.log(`An error happened while adding page number email ${email._id}`, err, err.stack);
    }));
  }

  downloadPages() {
    let p = Promise.resolve();

    _.forEach(this.pages, (page) => {
      p = p.then(() => {
        this.log(`Downloading page ${page._id} pdf`);

        return this.step(pdfHelper.downloadPdf({ ...page.pdf, filename: `page-${page._id}.pdf` })
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
    this.log('Compiling PDF Documents');
    return new Promise((resolve) => {
      const sortedEmails = _.sortBy(this.emails, (email) => { return this.data.emailPositionMap[email._id]; });
      const sortedPages = _.sortBy(this.pages, (page) => { return this.data.pagePositionMap[page._id]; });

      const pageFileArguments = _.map(sortedPages, (page) => { return page.pdf.localPath; });
      const emailFileArguments = _.map(sortedEmails, (email) => { return email.pdf.localPath; });

      const orderedFileArguments = [
        ...pageFileArguments,
        ...emailFileArguments,
      ];

      const groupLimit = 50;

      if (orderedFileArguments.length > groupLimit) {
        const groupedFileArguments = [];
        for (let i = 0, l = orderedFileArguments.length; i < l; i += groupLimit) {
          groupedFileArguments.push(orderedFileArguments.slice(i, i + groupLimit));
        }

        const concatonatedFiles = [];

        let tasks = Promise.resolve();
        _.forEach(groupedFileArguments, (fileArgs) => {
          tasks = tasks.then(() => { return pdfHelper.concatToFile(fileArgs); })
          .then((cFile) => {
            this.log(`blah hey concatonated file ${cFile}`);
            concatonatedFiles.push(cFile);
            this.log(`blah hi concatonatedFiles ${concatonatedFiles.join(' ')}`);
          });
        });

        tasks.then(() => {
          this.log(`blah hey results ${concatonatedFiles.join(' ')}`);
          pdfHelper.concatToFile(concatonatedFiles, '/tmp/compilation/final.pdf').then((data) => {
            this.log('blah hey concatonatedFiles must be done', data);
            this.log('blah hey no error');
            resolve(data);
            // this.log(`starting to sleep 1`);
            // setTimeout(() => {
            //   resolve(data);
            //   this.log('Done sleeping...');
            // }, 10 * 60 * 60 * 1000);
          })
          .catch((err) => {
            this.log(`blah error ${err.message}`, err.stack);
            setTimeout(() => {
              this.log('Done sleeping...');
            }, 30 * 60 * 1000);
          });
        });
      } else {
        resolve(pdfHelper.concatToFile(orderedFileArguments, '/tmp/compilation/final.pdf'));
      }
    });
  }

  offsetGutterMargins(pdfObj) {
    this.log('Adding Gutter Margins');
    const gutterMarginLatex = fs.readFileSync(gutterMarginLatexPath, 'utf8');

    return this.step(new Promise((resolve, reject) => {
      const oldPath = pdfObj.localPath;
      const pathPieces = pdfObj.localPath.split('/');
      const oldFileName = pathPieces.pop();
      const newFileName = oldFileName.replace(/\.pdf$/, '-guttered');
      const oldDir = pathPieces.join('/');
      // const newDir = '/var/host';
      const newDir = oldDir;
      const texName = oldFileName.replace(/\.pdf$/, '-gutter-margins.tex');
      const texPath = [newDir, texName].join('/');
      const gutterLatex = gutterMarginLatex
      .replace('GUTTER_MARGIN', config.gutterMarginOffset)
      .replace('GUTTER_MARGIN', config.gutterMarginOffset)
      .replace('PDF_PATH', oldPath)
      .replace('PDF_HEIGHT', config.height)
      .replace('PDF_WIDTH', config.width);

      this.log('GUTTER Pre File Write');
      fs.writeFile(texPath, gutterLatex, (err) => {
        this.log('GUTTER Post File Write 1');
        if (err) { return reject(err); }
        this.log('GUTTER Post File Write 2');

        const spawn = require('child_process').spawn; // eslint-disable-line global-require

        const command = `pdflatex -jobname="${newFileName}" -output-directory="${newDir}" ${texPath}`;
        this.log(`Gutter Margins Command: ${command}`);
        this.log('blah hey command', command);

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

        pdflatex.stdout.on('data', (data) => {
          fs.appendFileSync(logFile, data);
        });

        pdflatex.stdout.on('data', (data) => {
          console.log(`\nstdout: ${data}`);
        });

        pdflatex.stderr.on('data', (data) => {
          reject(`\nstderr: ${data}`);
        });

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
        return null;
      });
    }));

    // this.log('Adding Gutter Margins');
    //
    // return pdfHelper.addGutterMargins(pdfObj, this.log);
  }

  savePdfObject(pdfObj) {
    this.log('Save PDF Object');
    return this.step(pdfHelper.savePdfObject(pdfObj))
    .then((localPath) => {
      pdfObj.localPath = localPath; // eslint-disable-line no-param-reassign
      return Promise.resolve(pdfObj);
    });
  }

  getCompilationPdfPages(compilationFile) {
    this.log('Get Compilation PDF pages');

    const pagePageCount = _.reduce(
      _.map(this.pages, (page) => page.pdf.pageCount),
      (total, num) => total + num
    );

    const emailPageCount = _.reduce(
      _.map(this.emails, (email) => email.pdf.pageCount),
      (total, num) => total + num
    );

    this.log('Get Compilation PDF pages count', pagePageCount + emailPageCount);
    return Promise.resolve({
      model: 'compilation',
      _id: this.compilationId,
      modelVersion: undefined,
      pageCount: pagePageCount + emailPageCount,
      compilationFile,
    });

    // return pdfHelper.getPdfPages(buffer)
    // .then((pageCount) => {
    //   return Promise.resolve({
    //     model: 'compilation',
    //     _id: this.compilationId,
    //     modelVersion: undefined,
    //     pageCount,
    //     buffer,
    //   });
    // });
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
      this.log('blah before compilePdfDocuments');
      return this.step(this.compilePdfDocuments());
    })
    .then((buffer) => {
      this.log('blah after compilePdfDocuments before getCompilationPdfPages');
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
      this.log(`blah error ${err.message}`, err.stack);
      setTimeout(() => {
        this.log('Done sleeping...');
      }, 30 * 60 * 1000);
    });
  }
}

export default CompilationPdfPlan;
