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
      return new CompilationEmailsPdfPlan({ compilationId: task.props.compilationId, progress: task.progress });
    case 'compilation-pages-pdf' :
      return new CompilationPagesPdfPlan({ compilationId: task.props.compilationId, progress: task.progress });
    case 'compilation-pdf' :
      return new CompilationPdfPlan({ compilationId: task.props.compilationId, progress: task.progress });
    default:
      return null;
  }
}

class Task {
  constructor(props) {
    this.props = props;
    this.progress = this.progress.bind(this);
  }

  log(entry) {
    sendLog('update', entry);
  }

  progress(completed, total, data) {
    const percent = Number((completed / total).toFixed(2)) * 100;
    sendLog('progress', `${percent}% complete`, { completed, total, data });
  }

  start() {
    return planFactory(this).start();
  }
}

export default Task;
