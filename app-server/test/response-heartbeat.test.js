/* eslint-env mocha */
const assert = require('assert');
const { withHeartbeat, errorEnvelope } = require('../src/classes/response-heartbeat');

/** Minimal express-Response stand-in that records what the helper does. */
function makeRes() {
  return {
    statusCode: null,
    headers: {},
    contentType: null,
    chunks: [],
    sent: undefined,
    writableEnded: false,
    status(code) {
      this.statusCode = code; return this;
    },
    type(t) {
      this.contentType = t; return this;
    },
    set(k, v) {
      this.headers[k] = v; return this;
    },
    write(s) {
      this.chunks.push(s); return true;
    },
    end(s) {
      if (s !== undefined) {
        this.chunks.push(s);
      } this.writableEnded = true;
    },
    send(body) {
      this.sent = body; this.writableEnded = true;
    },
    body() {
      return this.chunks.join('');
    }
  };
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('response-heartbeat', () => {
  describe('errorEnvelope', () => {
    it('uses an Error message', () => {
      const env = errorEnvelope(new Error('boom'));
      assert.strictEqual(env.message, 'boom');
      assert.strictEqual(env.__error, true);
    });

    it('uses a string error verbatim', () => {
      assert.strictEqual(errorEnvelope('nope').message, 'nope');
    });

    it('falls back for empty input', () => {
      assert.strictEqual(errorEnvelope(null).message, 'Internal server error');
    });

    it('preserves a code when present', () => {
      const err = new Error('x');
      err.code = 42;
      assert.strictEqual(errorEnvelope(err).code, 42);
    });
  });

  describe('withHeartbeat fast path (no heartbeat)', () => {
    it('sends the payload with res.send and never streams', async () => {
      const res = makeRes();
      await withHeartbeat(res, async () => ({ file: 'a.pdf' }), { intervalMs: 10000 });
      assert.deepStrictEqual(res.sent, { file: 'a.pdf' });
      assert.strictEqual(res.chunks.length, 0);
      assert.strictEqual(res.statusCode, null);
    });

    it('reports a fast failure with a 500 and error envelope', async () => {
      const res = makeRes();
      await withHeartbeat(res, async () => {
        throw new Error('scanner offline');
      },
      { intervalMs: 10000 });
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.sent.message, 'scanner offline');
      assert.strictEqual(res.sent.__error, true);
    });
  });

  describe('withHeartbeat streaming path', () => {
    it('emits keep-alive whitespace then a parseable JSON body on success', async () => {
      const res = makeRes();
      await withHeartbeat(res, async () => {
        await delay(60); return { file: 'b.pdf' };
      },
      { intervalMs: 10 });
      const body = res.body();
      assert.ok(body.startsWith(' '), 'body should start with keep-alive whitespace');
      assert.deepStrictEqual(JSON.parse(body), { file: 'b.pdf' });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.contentType, 'application/json');
      assert.strictEqual(res.headers['X-Accel-Buffering'], 'no');
      assert.strictEqual(res.sent, undefined, 'must not use res.send once streaming');
    });

    it('reports a late failure in-band with a 200 status', async () => {
      const res = makeRes();
      await withHeartbeat(res, async () => {
        await delay(60); throw new Error('OCR failed');
      },
      { intervalMs: 10 });
      const body = res.body();
      assert.ok(body.trim().length > 0);
      const parsed = JSON.parse(body);
      assert.strictEqual(parsed.__error, true);
      assert.strictEqual(parsed.message, 'OCR failed');
      assert.strictEqual(res.statusCode, 200);
    });
  });
});
