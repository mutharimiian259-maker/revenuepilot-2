const supabase = require("../config/supabase");

const AUDIT_INTERVAL_MS = 3 * 60 * 1000;

async function auditSettlementStream() {

    try {

        const { data: recentTransactions } = await supabase
            .from("stk_transactions")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        if (!recentTransactions) return;

        for (const tx of recentTransactions) {

            /*
            ============================================
            SETTLEMENT CONSISTENCY SIGNALS
            ============================================
            */

            const signals = [];

            if (tx.status === "SUCCESS" && !tx.ledger_posted) {
                signals.push("SETTLEMENT_LEDGER_MISSING");
            }

            if (tx.status === "PENDING" && tx.callback_processed) {
                signals.push("STATE_CALLBACK_MISMATCH");
            }

            if (
                tx.execution_state === "SUCCESS_SETTLED" &&
                tx.status !== "SUCCESS"
            ) {
                signals.push("STATE_STATUS_DRIFT");
            }

            /*
            ============================================
            AUDIT LOGGING
            ============================================
            */

            if (signals.length > 0) {

                await supabase
                    .from("audit_logs")
                    .insert({
                        business_id: tx.business_id,
                        action: "AUDIT_ORACLE_SIGNAL",
                        description: signals.join(",")
                    });
            }
        }

    } catch (err) {
        console.error("Audit oracle worker error:", err.message);
    }
}

/*
============================================
STREAMING LOOP
============================================
*/

setInterval(auditSettlementStream, AUDIT_INTERVAL_MS);

module.exports = {};