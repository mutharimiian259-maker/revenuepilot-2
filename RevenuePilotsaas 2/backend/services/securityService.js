const crypto = require("crypto");

function verifyCallbackSignature(payload, secret) {
    return crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("hex");
}

module.exports = { verifyCallbackSignature };