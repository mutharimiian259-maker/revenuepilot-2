const cron = require("node-cron");

/*
=====================================
WORKER HEARTBEAT MONITOR
=====================================
*/

cron.schedule("*/1 * * * *", async () => {

    console.log("Payment worker heartbeat alive");

});