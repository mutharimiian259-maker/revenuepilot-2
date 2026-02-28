const supabase = require("../config/supabase");

/*
============================================
STK CALLBACK HANDLER (RACE SAFE VERSION)
============================================
*/

async function stkCallbackHandler(req, res) {
    try {

        const payload = req.body;

        const stkCallback =
            payload?.Body?.stkCallback;

        const merchantRequestId =
            stkCallback?.MerchantRequestID;

        const resultCode =
            stkCallback?.ResultCode;

        if (!merchantRequestId || merchantRequestId.trim() === "") {
            return res.status(400).json({
                status: "error",
                message: "Invalid merchant request id"
            });
        }

        /*
        ============================================
        FIND TRANSACTION
        ============================================
        */

        const { data: transaction } = await supabase
            .from("stk_transactions")
            .select("*")
            .eq("merchant_request_id", merchantRequestId)
            .single();

        if (!transaction) {
            return res.status(404).json({
                status: "error",
                message: "Transaction not found"
            });
        }

        /*
        ============================================
        PIPELINE REPLAY IMMUNITY
        ============================================
        */

        if (transaction.callback_processed) {
            return res.status(200).json({
                status: "success",
                message: "Callback already processed"
            });
        }

        /*
        ============================================
        EXECUTION LOCK GUARD (VERY IMPORTANT)
        ============================================
        */

        const lockKey = `callback_lock_${transaction.id}`;

        const { data: lockExists } = await supabase
            .from("processing_locks")
            .select("id")
            .eq("lock_key", lockKey)
            .maybeSingle();

        if (lockExists) {
            return res.status(200).json({
                status: "success",
                message: "Callback execution already locked"
            });
        }

        await supabase
            .from("processing_locks")
            .insert({
                lock_key: lockKey,
                created_at: new Date().toISOString()
            });

        /*
        ============================================
        PROCESS CALLBACK RESULT
        ============================================
        */

        let status = "FAILED";

        if (resultCode === 0) {
            status = "SUCCESS";
        }

        await supabase
            .from("stk_transactions")
            .update({
                status,
                callback_processed: true,
                updated_at: new Date().toISOString()
            })
            .eq("id", transaction.id);

        /*
        ============================================
        RELEASE PIPELINE LOCK
        ============================================
        */

        await supabase
            .from("processing_locks")
            .delete()
            .eq("lock_key", lockKey);

        return res.status(200).json({
            status: "success"
        });

    } catch (err) {
        console.error("Callback handler error:", err.message);

        return res.status(500).json({
            status: "error"
        });
    }
}

module.exports = {
    stkCallbackHandler
};