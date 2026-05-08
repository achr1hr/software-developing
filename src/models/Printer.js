import { PrinterStatus } from './enums';

export class Printer {
  /**
   * @param {{
   *   id?: string,
   *   modelName: string,
   *   status?: string,
   *   nozzleTemp?: number,
   *   bedTemp?: number,
   *   buildVolume?: import('./Dimensions').Dimensions | { x_mm: number, y_mm: number, z_mm: number }
   * }} params
   */
  constructor({
    id,
    modelName,
    status = PrinterStatus.IDLE,
    nozzleTemp = 0,
    bedTemp = 0,
    buildVolume = { x_mm: 220, y_mm: 220, z_mm: 250 },
  }) {
    this.id = id ?? crypto.randomUUID();
    this.modelName = modelName;
    this.status = status;
    this.nozzleTemp = nozzleTemp;
    this.bedTemp = bedTemp;
    this.buildVolume = buildVolume;
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
