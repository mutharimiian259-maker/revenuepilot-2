const supabase = require("../config/supabase");

const OBSERVATION_INTERVAL_MS = 4 * 60 * 1000;

async function shadowObserve() {
    try {

        const { data: transactions } = await supabase
            .from("stk_transactions")
            .select("*")
            .limit(50)
            .order("created_at", { ascending: false });

        if (!transactions) return;

        for (const tx of transactions) {

            /*
            ============================================
            CONSISTENCY CHECKS
            ============================================
            */

            const anomalySignals = [];

            if (tx.status === "SUCCESS" && !tx.ledger_posted) {
                anomalySignals.push("SUCCESS_NO_LEDGER_POST");
            }

            if (tx.processing_lock && !tx.lock_expires_at) {
                anomalySignals.push("LOCK_STATE_CORRUPTION");
            }

            if (
                tx.execution_state === "SUCCESS_SETTLED" &&
                tx.callback_processed !== true
            ) {
                anomalySignals.push("CALLBACK_INCONSISTENT");
            }

            /*
            ============================================
            AUDIT LOG IF ANOMALY FOUND
            ============================================
            */

            if (anomalySignals.length > 0) {

                await supabase
                    .from("audit_logs")
                    .insert({
                        business_id: tx.business_id,
                        action: "SHADOW_ANOMALY_DETECTED",
                        description: anomalySignals.join(",")
                    });
            }
        }

    } catch (err) {
        console.error("Shadow observer error:", err.message);
    }
}

/*
============================================
OBSERVATION LOOP
============================================
*/

setInterval(shadowObserve, OBSERVATION_INTERVAL_MS);

module.exports = {};