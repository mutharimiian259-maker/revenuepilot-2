const { processSubscriptions } = require("../services/subscriptionService");

setInterval(async () => {
    try {
        await processSubscriptions();
    } catch (err) {
        console.error("Subscription job error:", err.message);
    }
}, 86400000); // Runs once per day