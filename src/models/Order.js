import { OrderStatus } from './enums';

export class Order {
  /**
   * @param {{ id?: string, status?: string, createdAt?: Date, totalPrice?: number }} params
   */
  constructor({ id, status = OrderStatus.NEW, createdAt = new Date(), totalPrice = 0 } = {}) {
    this.id = id ?? crypto.randomUUID();
    this.status = status;
    this.createdAt = createdAt;
    this.totalPrice = totalPrice;
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
