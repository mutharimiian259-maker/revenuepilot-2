const { verifySignature } = require("../services/signatureService");

function signatureMiddleware(req, res, next) {

    const signature = req.headers["x-payment-signature"];

    if (!signature) {
        return res.status(401).json({
            status: "error",
            message: "Missing payment signature"
        });
    }

    const payload = {
        phone: req.body.phone,
        amount: req.body.amount,
        businessId: req.body.businessId
    };

    if (!verifySignature(payload, signature)) {
        return res.status(403).json({
            status: "error",
            message: "Invalid payment signature"
        });
    }

    next();
}

module.exports = signatureMiddleware;