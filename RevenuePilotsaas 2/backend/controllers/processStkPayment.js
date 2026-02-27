const supabase = require("../config/supabase");
const { createLedgerEntries } = require("./ledgerService");
const { createAuditLog } = require("./auditService");
const { runFraudChecks } = require("./fraudService");

async function processStkPayment(transactionId) {

    // 1️⃣ Atomic Lock Attempt
    const { data: transaction, error } = await supabase
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

    if (!transaction || error) {
        console.log("Transaction already processed or locked");
        return;
    }

    try {

        // Only process SUCCESS
        if (transaction.status !== "SUCCESS") {
            await releaseLock(transactionId);
            return;
        }

        // 2️⃣ Fraud Checks
        const flags = await runFraudChecks(transaction);

        if (flags.length > 0) {

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

        // 3️⃣ Idempotency Check (extra safety)
        if (transaction.ledger_posted) {
            await releaseLock(transactionId);
            return;
        }

        // 4️⃣ Ledger Posting
        await createLedgerEntries(transaction);

        // 5️⃣ Finalize Transaction
        const { error: updateError } = await supabase
            .from("stk_transactions")
            .update({
                ledger_posted: true,
                processing_lock: false
            })
            .eq("id", transactionId)
            .eq("ledger_posted", false);

        if (updateError) {
            throw new Error("Failed to finalize transaction");
        }

        await createAuditLog(
            transaction.business_id,
            "PAYMENT_SUCCESS",
            `Transaction ${transactionId} posted`
        );

        console.log("Payment fully processed");

    } catch (err) {

        await releaseLock(transactionId);
        console.error("Processing failed:", err.message);
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