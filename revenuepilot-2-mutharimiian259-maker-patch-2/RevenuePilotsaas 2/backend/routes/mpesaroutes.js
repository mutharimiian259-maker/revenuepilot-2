const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");

// =============================
// STK Initiation Route
// =============================
router.post("/stk", paymentController.initiateSTK);

// =============================
// STK Callback Route
// =============================
router.post("/callback", paymentController.stkCallback);

module.exports = router;