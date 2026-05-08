export class QCReport {
  /**
   * @param {{
   *   reportId?: string,
   *   isPassed?: boolean,
   *   comments?: string,
   *   photoUrl?: string,
   *   createdAt?: Date | string
   * }} params
   */
  constructor({
    reportId,
    isPassed = false,
    comments = '',
    photoUrl = '',
    createdAt = new Date(),
  } = {}) {
    this.reportId = reportId ?? crypto.randomUUID();
    this.isPassed = isPassed;
    this.comments = comments;
    this.photoUrl = photoUrl;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
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
