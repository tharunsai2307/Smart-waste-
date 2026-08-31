const { v4: uuidv4 } = require('uuid');

/** Short, human-typeable + QR-friendly unique codes. */
function genCode(prefix) {
  const rand = uuidv4().split('-')[0].toUpperCase();
  return `${prefix}-${rand}`;
}

function genQrPayload(kind, code) {
  // Encodes kind + code + a random nonce so QR content isn't guessable.
  const nonce = uuidv4().split('-')[0];
  return `SWM:${kind}:${code}:${nonce}`;
}

module.exports = { genCode, genQrPayload };
