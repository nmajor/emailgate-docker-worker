// import _ from 'lodash';
import CompilationEmailsPdfPlan from '../plans/CompilationEmailsPdfPlan';
import CompilationPagesPdfPlan from '../plans/CompilationPagesPdfPlan';
import EmailPdfPlan from '../plans/EmailPdfPlan';
// import PagePdfPlan from '../plans/PagePdfPlan';
import CompilationCoverPdfPlan from '../plans/CompilationCoverPdfPlan';
import CompilationPdfPlan from '../plans/CompilationPdfPlan';
import sendLog from './sendLog';

export function planFactory(task) {
  switch (task.props.kind) {
    case 'compilation-emails-pdf' :
      return new CompilationEmailsPdfPlan(task.props, task.progress);
    case 'compilation-pages-pdf' :
      return new CompilationPagesPdfPlan(task.props, task.progress);
    case 'compilation-cover-pdf' :
      return new CompilationCoverPdfPlan(task.props, task.progress);
    case 'compilation-pdf' :
      return new CompilationPdfPlan(task.props, task.progress);
    case 'email-pdf' :
      return new EmailPdfPlan({ ...task.props, progress: task.progress, log: task.log });
    default:
      return null;
  }
}

class Task {
  constructor(props) {
    this.props = props;
    this.props.progress = this.progress.bind(this);
    this.props.log = this.log.bind(this);
  }

  log(entry, payload) {
    sendLog('update', entry, payload);
  }

  progress(completed, total, data) {
    const percent = parseInt(Number((completed / total).toFixed(2)) * 100, 10);
    sendLog('progress', `${percent}%`, { completed, total, data });
  }

  start() {
    sendLog('status', `Starting ${this.props.kind} task.`);
    return planFactory(this).start();
  }
}

export default Task;
