const supabase = require("../config/supabase");
const { createAuditLog } = require("./auditService");
const { runFraudChecks } = require("./fraudService");

/*
============================================
ULTRA ENTERPRISE STK PAYMENT SERVICE
============================================
Architecture Level:
✔ App-layer fraud intelligence
✔ Database atomic transaction engine
✔ Double-entry accounting SQL RPC
✔ Immutable ledger audit
✔ Reversal-safe design
✔ Idempotent worker processing
============================================
*/

async function processStkPayment(transactionId) {

    try {

        /*
        =====================================
        Fetch Transaction
        =====================================
        */

        const { data: transaction, error } = await supabase
            .from("stk_transactions")
            .select("*")
            .eq("id", transactionId)
            .maybeSingle();

        if (error) throw error;
        if (!transaction) return;

        if (transaction.status !== "SUCCESS") return;

        if (!transaction.amount || transaction.amount <= 0) {
            throw new Error("Invalid transaction amount");
        }

        /*
        =====================================
        Fraud Detection Layer
        =====================================
        */

        const fraudFlags = await runFraudChecks(transaction);

        if (fraudFlags && fraudFlags.length > 0) {

            await supabase
                .from("stk_transactions")
                .update({
                    status: "FLAGGED",
                    fraud_flags: fraudFlags,
                    updated_at: new Date()
                })
                .eq("id", transactionId);

            await createAuditLog(
                transaction.business_id,
                "STK_PAYMENT_FLAGGED",
                fraudFlags.join(", ")
            );

            return;
        }

        /*
        =====================================
        Atomic Ledger Processing (SQL RPC Engine)
        =====================================
        */

        const { error: rpcError } = await supabase.rpc(
            "process_stk_payment_atomic",
            {
                p_transaction_id: transactionId
            }
        );

        if (rpcError) {
            throw rpcError;
        }

        /*
        =====================================
        Audit Trail Logging
        =====================================
        */

        await createAuditLog(
            transaction.business_id,
            "STK_PAYMENT_SUCCESS",
            `Atomic ledger posted for ${transactionId}`
        );

        console.log("Payment processed successfully.");

    } catch (err) {

        console.error("PaymentService Error:", err.message);
        throw err;
    }
}

module.exports = { processStkPayment };