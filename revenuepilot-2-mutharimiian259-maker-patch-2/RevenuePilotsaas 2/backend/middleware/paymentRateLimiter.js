const rateLimit = require("express-rate-limit");

const paymentRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // Maximum 5 payment initiation requests per minute per IP
    message: {
        status: "error",
        message: "Too many payment attempts. Please wait."
    }
});

module.exports = paymentRateLimiter;