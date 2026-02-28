const supabase = require("../config/supabase");

const WATCHDOG_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

async function recoverStuckLocks() {
    try {

        const now = new Date();

        /*
        ============================================
        FIND EXPIRED LOCKED TRANSACTIONS
        ============================================
        */

        const { data: stuckTransactions } = await supabase
            .from("stk_transactions")
            .select("*")
            .eq("processing_lock", true)
            .lt("lock_expires_at", now.toISOString());

        if (!stuckTransactions) return;

        for (const tx of stuckTransactions) {

            console.log("Recovering stuck transaction:", tx.id);

            await supabase
                .from("stk_transactions")
                .update({
                    processing_lock: false,
                    lock_expires_at: null,
                    processing_started_at: null
                })
                .eq("id", tx.id);
        }

    } catch (err) {
        console.error("Watchdog recovery error:", err.message);
    }
}

/*
============================================
WATCHDOG LOOP
============================================
*/

setInterval(recoverStuckLocks, WATCHDOG_INTERVAL_MS);

module.exports = {};