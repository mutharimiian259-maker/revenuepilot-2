const supabase = require("../config/supabase");

const RECOVERY_WINDOW_MINUTES = 10;
const WORKER_INTERVAL_MS = 2 * 60 * 1000;

/*
============================================
SELF HEALING PIPELINE RECOVERY
============================================
*/

async function recoverOrphanTransactions() {
    try {

        const timeoutThreshold = new Date(
            Date.now() - RECOVERY_WINDOW_MINUTES * 60 * 1000
        );

        /*
        ============================================
        FIND ORPHAN TRANSACTIONS
        ============================================
        */

        const { data: orphanTransactions } = await supabase
            .from("stk_transactions")
            .select("*")
            .eq("status", "PENDING")
            .lt("created_at", timeoutThreshold.toISOString())
            .eq("processing_lock", true);

        if (!orphanTransactions) return;

        for (const tx of orphanTransactions) {

            console.log("Recovering orphan transaction:", tx.id);

            await supabase
                .from("stk_transactions")
                .update({
                    processing_lock: false,
                    lock_expires_at: null
                })
                .eq("id", tx.id);
        }

    } catch (err) {
        console.error("Self healing worker error:", err.message);
    }
}

/*
============================================
RECOVERY LOOP
============================================
*/

setInterval(recoverOrphanTransactions, WORKER_INTERVAL_MS);

module.exports = {};