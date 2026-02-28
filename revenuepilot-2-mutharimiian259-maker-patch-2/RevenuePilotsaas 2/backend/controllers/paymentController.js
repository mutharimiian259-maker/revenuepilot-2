const supabase = require("../config/supabase");
const { processStkPayment } = require("../services/paymentService");
const { verifyCallbackSignature } = require("../services/securityService");
const { paymentQueue } = require("../config/queue");

/*
==================================================
Enterprise STK Callback Controller
==================================================
Security:
- Webhook signature verification
- Payload validation
- Async worker pipeline
==================================================
*/

async function stkCallback(req, res) {

    try {

        /*
        ======================================
        Webhook Signature Verification
        ======================================
        */

        const signature = req.headers["x-webhook-signature"];

        if (!signature) {
            return res.status(403).json({
                message: "Missing webhook signature"
            });
        }

        const computedSignature = verifyCallbackSignature(
            req.body,
            process.env.WEBHOOK_SECRET
        );

        if (signature !== computedSignature) {
            return res.status(403).json({
                message: "Invalid webhook signature"
            });
        }

        /*
        ======================================
        Payload Validation
        ======================================
        */

        const callback = req.body?.Body?.stkCallback;

        if (!callback) {
            return res.status(400).json({
                message: "Invalid callback payload"
            });
        }

        const merchantRequestID = callback.MerchantRequestID;

        if (!merchantRequestID) {
            return res.status(400).json({
                message: "Missing MerchantRequestID"
            });
        }

        const status =
            callback.ResultCode === 0
                ? "SUCCESS"
                : "FAILED";

        /*
        ======================================
        Transaction Update (Idempotent)
        ======================================
        */

        const { data, error } = await supabase
            .from("stk_transactions")
            .update({
                status,
                result_desc: callback.ResultDesc,
                updated_at: new Date()
            })
            .eq("merchant_request_id", merchantRequestID)
            .eq("processing_lock", false)
            .select()
            .single();

        if (error || !data) {
            console.error("Callback transaction update failed:", error);

            return res.status(500).json({
                message: "Transaction update failed"
            });
        }

        /*
        ======================================
        Worker Queue Dispatch
        ======================================
        */

        if (status === "SUCCESS") {

            await paymentQueue.add({
                transactionId: data.id
            });

        }

        return res.status(200).json({
            message: "Callback processed"
        });

    } catch (err) {

        console.error("Callback error:", err.message);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

module.exports = { stkCallback };