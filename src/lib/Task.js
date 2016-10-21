// import _ from 'lodash';
import CompilationEmailsPdfPlan from '../plans/CompilationEmailsPdfPlan';
import CompilationPagesPdfPlan from '../plans/CompilationPagesPdfPlan';
// import EmailPdfPlan from '../plans/EmailPdfPlan';
// import PagePdfPlan from '../plans/PagePdfPlan';
import CompilationPdfPlan from '../plans/CompilationPdfPlan';
import sendLog from './sendLog';

export function planFactory(task) {
  switch (task.props.kind) {
    case 'compilation-emails-pdf' :
      return new CompilationEmailsPdfPlan(task.props, task.progress);
    case 'compilation-pages-pdf' :
      return new CompilationPagesPdfPlan(task.props, task.progress);
    case 'compilation-pdf' :
      return new CompilationPdfPlan(task.props, task.progress);
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
    sendLog('progress', `${percent}% complete`, { completed, total, data });
  }

  start() {
    return planFactory(this).start();
  }
}

export default Task;
