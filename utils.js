const url = require("url");
const __ = require('underscore');
__.string = require('underscore.string');

/**
 * build a url to redirect from url, query params and hash
 */
const buildUrl = (urlStr, queryParams, hash = null) => {
  const urlObj = url.parse(urlStr, true); // todo: use `new URL` instead of `url.parse`
  delete urlObj.search;

  if (!urlObj.query) {
    urlObj.query = {};
  }

  Object.keys(queryParams).forEach(key => {
    urlObj.query[key] = queryParams[key];
  });

  urlObj.hash = hash ?? null;

  return url.format(urlObj);
};

/**
 * creates a buffer from the string `<clientId>:<clientSecret>`, and returns it according to base64, where clientId and clientSecret are both percent-encoded
 */
const encodeClientCredentials = (clientId, clientSecret) => {
  const buffer = Buffer.from(encodeURIComponent(clientId) + ":" + encodeURIComponent(clientSecret));
  return buffer.toString("base64");
};

const fetchCurrentJst = () => {
  const localUnixTime = Date.now(); // msec
  const jstTimelag = 9 * 60; // jst timelag from utc in min
  const timezoneOffset = new Date().getTimezoneOffset(); // @utc → 0, @jst → -540(min)
  const clientTimelagFromJst = (timezoneOffset + jstTimelag) * 60 * 1000; // msec
  return new Date(localUnixTime + clientTimelagFromJst);
};

const fetchCurrentDatetimeJst = () =>
  fetchCurrentJst()
    .toLocaleString('en-GB', {
      hour12: false,
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: 'numeric',
    })
    .replace(',', '');

/**
 * create a request body hoge=fuga&foo=boo from an object {hoge: fuga, foo: boo}
 */
const createRequestBody = obj => Object.keys(obj).map(key => `${key}=${encodeURIComponent(obj[key])}`).join("&");

/**
 * check if the requested scope is valid
 */
const isScopeValid = (requstedScope, scope) => requstedScope && Object.values(requstedScope).some(s => s === scope);

/**
 * get properties from an object
 */
const getPropsFromObj = (props, obj) => props.reduce((a, p) => ({...a, [p]: obj[p]}), {});

module.exports = {
  buildUrl,
  encodeClientCredentials,
  fetchCurrentJst,
  fetchCurrentDatetimeJst,
  createRequestBody,
  isScopeValid,
  getPropsFromObj
};
