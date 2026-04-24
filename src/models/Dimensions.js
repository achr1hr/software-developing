export class Dimensions {
  /** @param {number} x_mm @param {number} y_mm @param {number} z_mm */
  constructor(x_mm, y_mm, z_mm) {
    this.x_mm = x_mm;
    this.y_mm = y_mm;
    this.z_mm = z_mm;
  }

  /**
   * Returns true if this object fits inside a build box of the given dimensions.
   * @param {number} bx @param {number} by @param {number} bz
   * @returns {boolean}
   */
  validateFit(bx, by, bz) {
    return this.x_mm <= bx && this.y_mm <= by && this.z_mm <= bz;
  }
}
