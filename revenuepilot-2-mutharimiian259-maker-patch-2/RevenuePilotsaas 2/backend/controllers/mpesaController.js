const supabase = require("../config/supabase");
const { processStkPayment } = require("../services/paymentService");
const { verifyCallbackSignature } = require("../services/securityService");

/*
=====================================
M-Pesa STK Callback Controller
=====================================
This handles Safaricom payment result.
It must:
1. Verify webhook signature
2. Extract callback safely
3. Update transaction status
4. Trigger ledger processing on success
=====================================
*/

async function stkCallback(req, res) {
    try {

        /* ==============================
           1️⃣ Verify Webhook Signature
        ============================== */

        const signature = req.headers["x-webhook-signature"];

        if (!signature) {
            return res.status(403).json({ message: "Missing webhook signature" });
        }

        const computedSignature = verifyCallbackSignature(
            req.body,
            process.env.WEBHOOK_SECRET
        );

        if (signature !== computedSignature) {
            return res.status(403).json({ message: "Invalid callback signature" });
        }

        /* ==============================
           2️⃣ Validate Callback Format
        ============================== */

        const body = req.body;

        if (!body?.Body?.stkCallback) {
            return res.status(400).json({ message: "Invalid callback format" });
        }

        const callback = body.Body.stkCallback;

        const merchantRequestID = callback.MerchantRequestID;
        const resultCode = callback.ResultCode;
        const resultDesc = callback.ResultDesc;

        if (!merchantRequestID) {
            return res.status(400).json({ message: "Missing MerchantRequestID" });
        }

        /* ==============================
           3️⃣ Determine Payment Status
        ============================== */

        const status = resultCode === 0 ? "SUCCESS" : "FAILED";

        /* ==============================
           4️⃣ Update Transaction Record
        ============================== */

        const { data, error } = await supabase
            .from("stk_transactions")
            .update({
                status,
                result_desc: resultDesc,
                updated_at: new Date()
            })
            .eq("merchant_request_id", merchantRequestID)
            .select()
            .single();

        if (error || !data) {
            console.error("Transaction update error:", error);
            return res.status(500).json({ message: "Transaction update failed" });
        }

        /* ==============================
           5️⃣ Trigger Ledger Engine
        ============================== */

        if (status === "SUCCESS") {
            await processStkPayment(data.id);
        }

        return res.status(200).json({ message: "Callback processed successfully" });

    } catch (err) {
        console.error("Callback processing error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { stkCallback };