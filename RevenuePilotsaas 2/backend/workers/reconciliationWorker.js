const cron = require("node-cron");
const { reconciliationDaemon } = require("../services/reconciliationService");

cron.schedule("*/5 * * * *", async () => {

    try {
        await reconciliationDaemon();
    } catch (err) {
        console.error("Reconciliation worker error:", err.message);
    }

});