const { runReconciliation } = require("../services/reconciliationService");

setInterval(async () => {
    try {
        await runReconciliation();
    } catch (err) {
        console.error("Reconciliation error:", err.message);
    }
}, 60000); // runs every 60 seconds