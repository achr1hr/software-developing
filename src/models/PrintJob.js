export class PrintJob {
  /**
   * @param {{ jobID?: string, gcodePath: string, startTime?: Date | null, priority?: number }} params
   */
  constructor({ jobID, gcodePath, startTime = null, priority = 0 }) {
    this.jobID = jobID ?? crypto.randomUUID();
    this.gcodePath = gcodePath;
    this.startTime = startTime;
    this.priority = priority;
    /** @type {import('./Printer').Printer | null} */
    this.printer = null;
  }

  pause() {}

  cancel() {}
}
