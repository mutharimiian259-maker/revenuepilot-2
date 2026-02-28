const supabase = require("../config/supabase");

const PROCESS_INTERVAL_MS = 60 * 1000;
const MAX_PROCESS_PER_RUN = 10;

/*
============================================
CALLBACK BUFFER PROCESSOR
NETWORK STORM SAFE VERSION
============================================
*/

async function processCallbackBuffer() {
    try {

        const { data: queue } = await supabase
            .from("callback_buffer_queue")
            .select("*")
            .eq("processed", false)
            .order("created_at", { ascending: true })
            .limit(50);

        if (!queue || queue.length === 0) return;

        /*
        ============================================
        BACKPRESSURE CONTROL
        ============================================
        */

        const limitedQueue = queue.slice(0, MAX_PROCESS_PER_RUN);

        for (const event of limitedQueue) {

            if (!event.payload) continue;

            const payload = event.payload;
            const stkCallback = payload?.Body?.stkCallback;

            if (!stkCallback) continue;

            const merchantRequestId =
                stkCallback?.MerchantRequestID;

            if (!merchantRequestId || merchantRequestId.trim() === "") {
                continue;
            }

            const resultCode =
                stkCallback?.ResultCode;

            let status = "FAILED";

            if (resultCode === 0) {
                status = "SUCCESS";
            }

            /*
            ============================================
            FETCH TRANSACTION
            ============================================
            */

            const { data: transaction } = await supabase
                .from("stk_transactions")
                .select("*")
                .eq("merchant_request_id", merchantRequestId)
                .single();

            if (!transaction) continue;

            /*
            ============================================
            EXECUTION SAFETY CHECK
            ============================================
            */

            if (transaction.callback_processed) continue;

            /*
            ============================================
            UPDATE TRANSACTION STATE
            ============================================
            */

            await supabase
                .from("stk_transactions")
                .update({
                    status,
                    callback_processed: true
                })
                .eq("id", transaction.id);

            /*
            ============================================
            MARK BUFFER EVENT PROCESSED
            ============================================
            */

            await supabase
                .from("callback_buffer_queue")
                .update({
                    processed: true
                })
                .eq("id", event.id);
        }

    } catch (err) {
        console.error("Callback buffer worker error:", err.message);
    }
}

/*
============================================
WORKER LOOP
============================================
*/

setInterval(processCallbackBuffer, PROCESS_INTERVAL_MS);

module.exports = {};