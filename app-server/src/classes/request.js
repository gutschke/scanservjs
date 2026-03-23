const LogFormatter = require('./log-formatter');

const log = require('loglevel').getLogger('Request');

/**
 * @param {number} data
 * @returns {ScanDeviceFeature} feature
 */
function constrainWithFeature(value, feature) {
  return Math.max(Math.min(value || feature.default, feature.limits[1]), feature.limits[0]);
}

/**
 *
 * @param {string[]} list
 * @param {string|string[]} value
 * @param {string} message
 */
function assertContains(list, value, message) {
  if (Array.isArray(value)) {
    value.forEach(v => assertContains(list, v, message));
  } else if (!list.includes(value)) {
    throw new Error(`${message}: '${value}' not in '${list}'`);
  }
}

module.exports = class Request {
  /**
   * Constructor
   * @param {Context} context
   * @param {ScanRequest} data
   */
  constructor(context, data) {
    Object.assign(this, {
      params: {},
      pipeline: null
    });

    const device = context.getDevice(data.params.deviceId);
    const features = device.features;

    Object.assign(this, {
      params: {
        deviceId: device.id,
        resolution: data.params.resolution || features['--resolution'].default,
        format: 'tiff',
        isPreview: data.params.isPreview || false
      },
      filters: data.filters || device.settings.filters.default,
      pipeline: data.pipeline || device.settings.pipeline.default,
      batch: data.batch || device.settings.batchMode.default,
      autoCropMode: data.autoCropMode || device.settings.autoCropMode.default,
      index: data.index || 1
    });

    assertContains(device.settings['filters'].options, this.filters, 'Invalid filters');
    assertContains(device.settings['pipeline'].options, this.pipeline, 'Invalid pipeline');
    assertContains(device.settings['batchMode'].options, this.batch, 'Invalid batchMode');
    assertContains(device.settings['autoCropMode'].options, this.autoCropMode, 'Invalid autoCropMode');

    // Look up source constraint before clamping geometry so it can override
    // the SANE-reported device-wide limits in either direction (shrink for
    // flatbed, expand for ADF that supports longer paper than the flatbed cap).
    // Use data.params.source here because this.params.source isn't set yet.
    const requestedSource = data.params.source
      || ('--source' in features ? features['--source'].default : null);
    const deviceSourceSizes = device.sourceSizes && device.sourceSizes.length
      ? device.sourceSizes
      : (context.sourceSizes || []);
    const sourceConstraint = (deviceSourceSizes.length && requestedSource)
      ? deviceSourceSizes.find(sc =>
        requestedSource.toLowerCase().includes(sc.source.toLowerCase()))
      : null;

    if ('-t' in features) {
      this.params.top = constrainWithFeature(data.params.top || features['-t'].limits[0], features['-t']);
    }
    if ('-l' in features) {
      this.params.left = constrainWithFeature(data.params.left || features['-l'].limits[0], features['-l']);
    }
    if ('-x' in features) {
      const maxX = sourceConstraint ? sourceConstraint.dimensions.x : features['-x'].limits[1];
      this.params.width = Math.max(features['-x'].limits[0],
        Math.min(data.params.width || maxX, maxX));
    }
    if ('-y' in features) {
      const maxY = sourceConstraint ? sourceConstraint.dimensions.y : features['-y'].limits[1];
      this.params.height = Math.max(features['-y'].limits[0],
        Math.min(data.params.height || maxY, maxY));
    }
    if ('--page-height' in features) {
      this.params.pageHeight = constrainWithFeature(data.params.pageHeight, features['--page-height']);
    }
    if ('--page-width' in features) {
      this.params.pageWidth = constrainWithFeature(data.params.pageWidth, features['--page-width']);
    }

    if ('--mode' in features) {
      this.params.mode = data.params.mode || features['--mode'].default;
      assertContains(features['--mode'].options, this.params.mode, 'Invalid --mode');
    }
    if ('--adf-mode' in features) {
      this.params.adfMode = data.params.adfMode || features['--adf-mode'].default;
      assertContains(features['--adf-mode'].options, this.params.adfMode, 'Invalid --adf-mode');
    }
    if ('--source' in features) {
      this.params.source = data.params.source || features['--source'].default;
      assertContains(features['--source'].options, this.params.source, 'Invalid --source');
    }
    if ('--brightness' in features) {
      this.params.brightness = data.params.brightness || 0;
    }
    if ('--contrast' in features && this.params.mode !== 'Lineart') {
      this.params.contrast = data.params.contrast || 0;
    }
    if ('--disable-dynamic-lineart' in features) {
      this.params.dynamicLineart = data.params.dynamicLineart !== undefined
        ? data.params.dynamicLineart
        : true;
    }
    if ('--ald' in features) {
      this.params.ald = data.params.ald || features['--ald'].default;
      assertContains(features['--ald'].options, this.params.ald, 'Invalid --ald');
    }

    // Handle image transformations
    this.transformations = data.transformations || {
      rotation: 0,
      flipH: false,
      flipV: false
    };

    log.trace(LogFormatter.format().full(this));
  }
};
