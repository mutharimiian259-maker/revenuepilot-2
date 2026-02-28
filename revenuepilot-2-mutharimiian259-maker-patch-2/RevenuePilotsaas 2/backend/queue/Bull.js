const Bull = require("bull");

/*
========================================
ENTERPRISE PAYMENT QUEUE CONFIG
========================================
✔ Retry resilience
✔ Stalled job recovery
✔ Processing timeout protection
✔ Redis durable transport
========================================
*/

const paymentQueue = new Bull("paymentQueue", {
    redis: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379
    },
    settings: {
        stalledInterval: 30000,      // Detect stalled jobs every 30s
        maxStalledCount: 3,          // Retry stalled jobs 3 times
        lockDuration: 600000         // Worker lock timeout (10 min)
    }
});

/*
========================================
Global Queue Failure Logger
========================================
*/

paymentQueue.on("failed", (job, err) => {
    console.error(
        `Payment job failed [JobID:${job.id}]`,
        err.message
    );
});

module.exports = { paymentQueue };