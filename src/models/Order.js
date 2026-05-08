import { OrderStatus } from './enums';

export class Order {
  /**
   * @param {{
   *   id?: string,
   *   customerName?: string,
   *   customerContact?: string,
   *   title?: string,
   *   status?: string,
   *   createdAt?: Date | string,
   *   totalPrice?: number,
   *   assignedPrinterId?: string | null,
   *   printJobId?: string | null
   * }} params
   */
  constructor({
    id,
    customerName = '',
    customerContact = '',
    title = '',
    status = OrderStatus.NEW,
    createdAt = new Date(),
    totalPrice = 0,
    assignedPrinterId = null,
    printJobId = null,
  } = {}) {
    this.id = id ?? crypto.randomUUID();
    this.customerName = customerName;
    this.customerContact = customerContact;
    this.title = title;
    this.status = status;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.totalPrice = totalPrice;
    this.assignedPrinterId = assignedPrinterId;
    this.printJobId = printJobId;
    /** @type {import('./PrintModel').PrintModel[]} */
    this.models = [];
    /** @type {import('./QCReport').QCReport | null} */
    this.qcReport = null;
  }

  /** @returns {number} */
  calculateCost() {
    return this.models.reduce((sum, m) => sum + m.volume_cm3, 0);
  }

  /** @param {string} newStatus */
  updateStatus(newStatus) {
    if (!Object.values(OrderStatus).includes(newStatus)) {
      throw new Error(`Invalid OrderStatus: ${newStatus}`);
    }
    this.status = newStatus;
  }
}
