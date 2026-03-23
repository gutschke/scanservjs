const Regex = require('./regex');

module.exports = class DeviceIdParser {
  constructor(data) {
    this.data = data;
  }

  /**
   * @returns {Array<{id: string, description: string}>}
   */
  entries() {
    return Regex.with(/device `?([^']+)'(.*)/g)
      .matchAll(this.data)
      .map(m => ({ id: m[1].trim(), description: m[2].trim() }));
  }

  /**
   * @returns {string[]}
   */
  ids() {
    return this.entries().map(e => e.id);
  }
};
