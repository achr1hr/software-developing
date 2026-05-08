export class PrintJob {
  /**
   * @param {{
   *   jobID?: string,
   *   orderId?: string,
   *   modelId?: string,
   *   gcodePath: string,
   *   startTime?: Date | string | null,
   *   priority?: number
   * }} params
   */
  constructor({ jobID, orderId = '', modelId = '', gcodePath, startTime = null, priority = 0 }) {
    this.jobID = jobID ?? crypto.randomUUID();
    this.orderId = orderId;
    this.modelId = modelId;
    this.gcodePath = gcodePath;
    this.startTime = startTime ? new Date(startTime) : null;
    this.priority = priority;
    /** @type {import('./Printer').Printer | null} */
    this.printer = null;
  }

  pause() {}

  cancel() {}
}
