const log = require('loglevel').getLogger('ResponseHeartbeat');

// Default cadence at which keep-alive bytes are emitted. Comfortably below the
// 60s read timeout used by common reverse-proxy defaults (e.g. nginx
// proxy_read_timeout).
const HEARTBEAT_INTERVAL_MS = 20000;

/**
 * Build the JSON error body sent when a long-running task fails. The `__error`
 * flag lets the client recognise an error that had to be reported with a 200
 * status because the response was already streaming (see withHeartbeat).
 * @param {any} error
 * @returns {{message: string, code: number, __error: boolean}}
 */
function errorEnvelope(error) {
  let message = 'Internal server error';
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    message = error.message;
  } else if (typeof error === 'string' && error.length > 0) {
    message = error;
  }
  const code = (error && typeof error.code !== 'undefined') ? error.code : -1;
  return { message, code, __error: true };
}

/**
 * Run a long async task while keeping the HTTP connection alive.
 *
 * Reverse proxies close upstream connections that produce no bytes for too long
 * (nginx `proxy_read_timeout` defaults to 60s). A multi-page scan followed by
 * OCR can easily exceed that, so while the task runs we periodically write a
 * single space. A space is valid leading JSON whitespace, so the client's
 * `response.json()` ignores it, but each byte resets the proxy's read timer.
 *
 * Until the first heartbeat is flushed the response status line is uncommitted,
 * so fast responses and fast failures use ordinary status codes (200 / 500).
 * Once a heartbeat has been written the status is necessarily 200, so a later
 * failure is reported in-band via an `{ __error: true }` envelope that the
 * client detects.
 *
 * @param {import('express').Response} res
 * @param {() => Promise<any>} work resolves with the JSON payload to send
 * @param {{intervalMs?: number}} [options] test seam
 * @returns {Promise<void>}
 */
async function withHeartbeat(res, work, options = {}) {
  const intervalMs = options.intervalMs || HEARTBEAT_INTERVAL_MS;
  let streaming = false;

  const beat = () => {
    if (res.writableEnded) {
      return;
    }
    if (!streaming) {
      streaming = true;
      res.status(200);
      res.type('application/json');
      // Ask nginx not to buffer the response so the heartbeat is forwarded
      // promptly rather than held until the body completes.
      res.set('X-Accel-Buffering', 'no');
    }
    res.write(' ');
  };

  const timer = setInterval(beat, intervalMs);
  // Do not let the heartbeat keep the event loop (or test process) alive.
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  try {
    const payload = await work();
    clearInterval(timer);
    const body = payload === undefined ? {} : payload;
    if (streaming) {
      res.end(JSON.stringify(body));
    } else {
      res.send(body);
    }
  } catch (error) {
    clearInterval(timer);
    log.error(error);
    if (streaming) {
      // Headers are already flushed as 200 — the status can no longer convey
      // the failure, so signal it in the body instead.
      res.end(JSON.stringify(errorEnvelope(error)));
    } else {
      res.status(500).send(errorEnvelope(error));
    }
  }
}

module.exports = { withHeartbeat, errorEnvelope, HEARTBEAT_INTERVAL_MS };
