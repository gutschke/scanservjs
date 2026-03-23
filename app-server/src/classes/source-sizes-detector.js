const http = require('http');
const https = require('https');

const log = require('loglevel').getLogger('SourceSizesDetector');

/**
 * Extract a numeric value from within a named XML section.
 * Namespace prefixes are ignored.
 * @param {string} xml
 * @param {string} section - e.g. 'PlatenInputCaps'
 * @param {string} field - e.g. 'MaxWidth'
 * @returns {number|null}
 */
function extractFromSection(xml, section, field) {
  const sectionRe = new RegExp(
    `<[^>:]*:?${section}[^>]*>([\\s\\S]*?)<\\/[^>:]*:?${section}>`, 'i');
  const sectionMatch = sectionRe.exec(xml);
  if (!sectionMatch) {
    return null;
  }
  const fieldRe = new RegExp(
    `<[^>:]*:?${field}[^>]*>(\\d+)<\\/[^>:]*:?${field}>`, 'i');
  const fieldMatch = fieldRe.exec(sectionMatch[1]);
  return fieldMatch ? parseInt(fieldMatch[1], 10) : null;
}

/**
 * Fetch a URL using http or https.
 * @param {string} url
 * @returns {Promise<string>}
 */
function fetchUrl(url) {
  const transport = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('HTTP timeout')); });
  });
}

module.exports = class SourceSizesDetector {
  /**
   * Attempt to detect per-source scan area limits for a device described by
   * the 'scanimage -L' description string (the part after the device id).
   *
   * For airscan/eSCL devices the description contains 'ip=<addr>', which is
   * used to query the eSCL ScannerCapabilities endpoint.
   *
   * Returns an empty array when detection is not possible or fails.
   *
   * @param {string} description - e.g. 'is a eSCL MultiFunctionLaserjet ip=172.24.0.6'
   * @returns {Promise<Array<{source: string, dimensions: {x: number, y: number}}>>}
   */
  static async detect(description) {
    const ipMatch = description && /\bip=(\S+)/.exec(description);
    if (!ipMatch) {
      return [];
    }
    try {
      return await SourceSizesDetector.detectEscl(ipMatch[1]);
    } catch (e) {
      log.debug(`eSCL source size detection failed for ${ipMatch[1]}: ${e.message}`);
      return [];
    }
  }

  /**
   * Query an eSCL ScannerCapabilities endpoint and return per-source limits.
   *
   * Dimension values in the eSCL XML are in units of 1/10 mm (so divide by
   * 10 to get mm). This matches the format used by HP and airscan-compatible
   * devices; the conversion factor can be verified by checking that the
   * reported flatbed MaxHeight matches the known physical flatbed size.
   *
   * @param {string} ip
   * @returns {Promise<Array<{source: string, dimensions: {x: number, y: number}}>>}
   */
  static async detectEscl(ip) {
    const xml = await fetchUrl(`http://${ip}/eSCL/ScannerCapabilities`);
    const result = [];

    // eSCL units: 1/10 mm
    const toMm = v => Math.round(v) / 10;

    const platenW = extractFromSection(xml, 'PlatenInputCaps', 'MaxWidth');
    const platenH = extractFromSection(xml, 'PlatenInputCaps', 'MaxHeight');
    if (platenW !== null && platenH !== null) {
      result.push({
        source: 'flatbed',
        dimensions: { x: toMm(platenW), y: toMm(platenH) }
      });
    }

    const adfW = extractFromSection(xml, 'AdfSimplexInputCaps', 'MaxWidth');
    const adfH = extractFromSection(xml, 'AdfSimplexInputCaps', 'MaxHeight');
    if (adfW !== null && adfH !== null) {
      result.push({
        source: 'adf',
        dimensions: { x: toMm(adfW), y: toMm(adfH) }
      });
    }

    log.debug(`eSCL source sizes for ${ip}: ${JSON.stringify(result)}`);
    return result;
  }
};
