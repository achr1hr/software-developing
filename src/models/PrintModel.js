import { Dimensions } from './Dimensions';

export class PrintModel {
  /**
   * @param {{
   *   id?: string,
   *   fileName: string,
   *   stlPath: string,
   *   volume_cm3: number,
   *   size: Dimensions | { x_mm: number, y_mm: number, z_mm: number }
   * }} params
   */
  constructor({ id, fileName, stlPath, volume_cm3, size }) {
    this.id = id ?? crypto.randomUUID();
    this.fileName = fileName;
    this.stlPath = stlPath;
    this.volume_cm3 = volume_cm3;
    this.size = size instanceof Dimensions ? size : new Dimensions(size.x_mm, size.y_mm, size.z_mm);
    /** @type {import('./PrintJob').PrintJob | null} */
    this.printJob = null;
  }

  /** @returns {boolean} */
  validate() {
    return Boolean(
      this.fileName &&
      this.stlPath &&
      this.volume_cm3 > 0 &&
      this.size.x_mm > 0 &&
      this.size.y_mm > 0 &&
      this.size.z_mm > 0,
    );
  }
}
