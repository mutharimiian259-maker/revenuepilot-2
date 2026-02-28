const express = require("express");
const router = express.Router();

const { initiateStkPayment } = require("../services/paymentService");

const validatePaymentRequest = require("../middleware/validationMiddleware");
const signatureMiddleware = require("../middleware/signatureMiddleware");
const paymentRateLimiter = require("../middleware/paymentRateLimiter");

/*
============================================
STK PAYMENT ROUTE
============================================
*/

router.post(
    "/stk",
    paymentRateLimiter,
    validatePaymentRequest,
    signatureMiddleware,
    initiateStkPayment
);

module.exports = router;