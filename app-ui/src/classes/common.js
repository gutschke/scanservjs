export default {
  async fetch(url, options) {
    const response = await fetch(url, options);

    // Read the body as text first so we can degrade gracefully when it is not
    // JSON — e.g. a reverse proxy returning an HTML 504 page. Long-running
    // endpoints stream leading whitespace as a keep-alive, which JSON.parse
    // ignores.
    const text = await response.text();
    let json = null;
    if (text.trim().length > 0) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        json = null;
      }
    }

    if (!response.ok) {
      throw this._errorMessage(json, response);
    }

    // A long-running request that failed after it had already started
    // streaming reports the error in-band with a 200 status.
    if (json && json.__error) {
      throw json.message || this._errorMessage(json, response);
    }

    if (json === null) {
      throw this._errorMessage(json, response);
    }

    return json;
  },

  /**
   * Produce a human-readable error string from a (possibly missing) JSON body.
   * @param {object|null} json
   * @param {Response} response
   * @returns {string}
   */
  _errorMessage(json, response) {
    if (json && typeof json.message === 'string' && json.message.length > 0) {
      return json.message;
    }
    const status = response.statusText
      ? `${response.status} ${response.statusText}`
      : `${response.status}`;
    return `Request failed (${status})`;
  },

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
};
