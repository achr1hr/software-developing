export class QCReport {
  /**
   * @param {{ reportId?: string, isPassed?: boolean, comments?: string, photoUrl?: string }} params
   */
  constructor({ reportId, isPassed = false, comments = '', photoUrl = '' } = {}) {
    this.reportId = reportId ?? crypto.randomUUID();
    this.isPassed = isPassed;
    this.comments = comments;
    this.photoUrl = photoUrl;
  }

  /**
   * @param {boolean} status
   * @param {string} comment
   */
  submitResult(status, comment) {
    this.isPassed = status;
    this.comments = comment;
  }
}
