const cron = require("node-cron");
const { paymentQueue } = require("../config/queue");

/*
=====================================
WORKER WATCHDOG PROTECTION DAEMON
Runs every 2 minutes
=====================================
*/

cron.schedule("*/2 * * * *", async () => {

    try {

        console.log("Watchdog scanning worker health...");

        const waiting = await paymentQueue.getWaitingCount();
        const active = await paymentQueue.getActiveCount();
        const failed = await paymentQueue.getFailedCount();

        /*
        =====================================
        Queue Anomaly Detection
        =====================================
        */

        if (waiting > 50) {
            console.warn("Queue backlog anomaly detected");
        }

        if (active === 0 && waiting > 0) {
            console.warn("Possible worker zombie or crash state");
        }

        if (failed > 100) {
            console.warn("High payment failure rate detected");
        }

    } catch (err) {
        console.error("Watchdog daemon error:", err.message);
    }

});