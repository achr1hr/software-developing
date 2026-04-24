import { PrinterStatus } from './enums';

export class Printer {
  /**
   * @param {{
   *   id?: string,
   *   modelName: string,
   *   status?: string,
   *   nozzleTemp?: number,
   *   bedTemp?: number
   * }} params
   */
  constructor({ id, modelName, status = PrinterStatus.IDLE, nozzleTemp = 0, bedTemp = 0 }) {
    this.id = id ?? crypto.randomUUID();
    this.modelName = modelName;
    this.status = status;
    this.nozzleTemp = nozzleTemp;
    this.bedTemp = bedTemp;
  }

  /**
   * Assigns a job to this printer. Returns false if the printer is not idle.
   * @param {import('./PrintJob').PrintJob} job
   * @returns {boolean}
   */
  assignJob(job) {
    if (this.status !== PrinterStatus.IDLE) return false;
    this.status = PrinterStatus.PRINTING;
    job.printer = this;
    job.startTime = new Date();
    return true;
  }
}
