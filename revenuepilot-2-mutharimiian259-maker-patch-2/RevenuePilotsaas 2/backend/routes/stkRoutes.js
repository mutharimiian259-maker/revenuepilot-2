const router = require("express").Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const limiter = require("../middleware/rateLimiter");
const stkController = require("../controllers/stkController");

router.post(
    "/request",
    limiter,
    authMiddleware,
    roleMiddleware("employee"),
    stkController.requestPayment
);

module.exports = router;