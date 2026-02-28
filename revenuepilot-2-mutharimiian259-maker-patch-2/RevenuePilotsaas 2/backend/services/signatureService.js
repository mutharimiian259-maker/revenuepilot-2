const crypto = require("crypto");

const SECRET_KEY = process.env.PAYMENT_SECRET || "CHANGE_ME_IN_PRODUCTION";

/*
============================================
SIGNATURE GENERATOR
============================================
*/

function generateSignature(payload) {
    return crypto
        .createHmac("sha256", SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest("hex");
}

/*
============================================
SIGNATURE VALIDATOR
============================================
*/

function verifySignature(payload, signature) {

    const expectedSignature = generateSignature(payload);

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature || "")
    );
}

module.exports = {
    generateSignature,
    verifySignature
};