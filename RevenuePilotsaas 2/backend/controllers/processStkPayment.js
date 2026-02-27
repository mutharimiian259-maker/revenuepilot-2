const supabase = require("../config/supabase");
const { createLedgerEntries } = require("./ledgerService");
const { createAuditLog } = require("./auditService");
const { runFraudChecks } = require("./fraudService");

async function processStkPayment(transactionId) {

    /*
    =============================
    Atomic Transaction Lock
    =============================
    */

    const { data: transaction, error: lockError } = await supabase
        .from("stk_transactions")
        .update({
            processing_lock: true,
            updated_at: new Date()
        })
        .eq("id", transactionId)
        .eq("ledger_posted", false)
        .eq("processing_lock", false)
        .select()
        .maybeSingle();

    if (!transaction || lockError) {
        console.log("Transaction already processed or locked.");
        return;
    }

    try {

        /*
        =============================
        Only Process Successful Payment
        =============================
        */

        if (transaction.status !== "SUCCESS") {
            await releaseLock(transactionId);
            return;
        }

        /*
        =============================
        Fraud Detection Layer
        =============================
        */

        const flags = await runFraudChecks(transaction);

        if (flags && flags.length > 0) {

            await supabase
                .from("stk_transactions")
                .update({
                    status: "FLAGGED",
                    fraud_flags: flags,
                    processing_lock: false
                })
                .eq("id", transactionId);

            await createAuditLog(
                transaction.business_id,
                "PAYMENT_FLAGGED",
                flags.join(", ")
            );

            return;
        }

        /*
        =============================
        Ledger Posting
        =============================
        */

        await createLedgerEntries(transaction);

        /*
        =============================
        Finalize Transaction
        =============================
        */

        const { error: updateError } = await supabase
            .from("stk_transactions")
            .update({
                ledger_posted: true,
                processing_lock: false,
                completed_at: new Date()
            })
            .eq("id", transactionId)
            .eq("ledger_posted", false);

        if (updateError) {
            throw new Error("Failed to finalize transaction");
        }

        await createAuditLog(
            transaction.business_id,
            "STK_PAYMENT_SUCCESS",
            `Transaction ${transactionId} ledger posted`
        );

        console.log("Payment processed successfully.");

    } catch (err) {

        console.error("Processing failed:", err.message);

        await releaseLock(transactionId);

        throw err;
    }
}

async function releaseLock(transactionId) {
    await supabase
        .from("stk_transactions")
        .update({ processing_lock: false })
        .eq("id", transactionId);
}

module.exports = { processStkPayment };