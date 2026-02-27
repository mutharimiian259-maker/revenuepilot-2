const cron = require("node-cron");
const supabase = require("../config/supabase");
const { processStkPayment } = require("../services/paymentService");

/*
=====================================
SELF HEALING PAYMENT CORE DAEMON
Runs every 5 minutes
=====================================
*/

cron.schedule("*/5 * * * *", async () => {

    try {

        console.log("Running self healing payment scan...");

        /*
        =====================================
        Detect stuck payments
        =====================================
        */

        const { data: stuckPayments } = await supabase
            .from("stk_transactions")
            .select("*")
            .eq("ledger_posted", false)
            .eq("status", "SUCCESS")
            .eq("processing_lock", false)
            .limit(20);

        for (const tx of stuckPayments || []) {

            try {

                console.log("Self healing transaction:", tx.id);

                await processStkPayment(tx.id);

            } catch (err) {
                console.error("Self healing retry failed:", err.message);
            }
        }

    } catch (err) {
        console.error("Self healing daemon error:", err.message);
    }

});