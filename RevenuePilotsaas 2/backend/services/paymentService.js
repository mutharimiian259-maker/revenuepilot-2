const supabase = require("../config/supabase");
const { createAuditLog } = require("./auditService");
const { runFraudChecks } = require("./fraudService");

/*
=====================================
processStkPayment (Enterprise Version)
=====================================
Responsibilities:
1. Atomic lock transaction
2. Prevent duplicate ledger posting
3. Run fraud checks
4. Post double-entry ledger
5. Mark transaction completed
6. Unlock safely on failure
=====================================
*/

async function processStkPayment(transactionId) {

    // ==============================
    // 1️⃣ Atomic Lock
    // ==============================

    const { data: transaction, error: lockError } = await supabase
        .from("stk_transactions")
        .update({ processing_lock: true })
        .eq("id", transactionId)
        .eq("ledger_posted", false)
        .eq("processing_lock", false)
        .select()
        .single();

    if (lockError || !transaction) {
        console.log("Transaction already processed, locked, or not found.");
        return;
    }

    try {

        // ==============================
        // 2️⃣ Only process SUCCESS
        // ==============================

        if (transaction.status !== "SUCCESS") {

            await unlockTransaction(transactionId);
            return;
        }

        // ==============================
        // 3️⃣ Fraud Detection Layer
        // ==============================

        const fraudFlags = await runFraudChecks(transaction);

        if (fraudFlags.length > 0) {

            await supabase
                .from("stk_transactions")
                .update({
                    status: "FLAGGED",
                    processing_lock: false,
                    fraud_flags: fraudFlags
                })
                .eq("id", transactionId);

            await createAuditLog(
                transaction.business_id,
                "STK_PAYMENT_FLAGGED",
                `Fraud flags: ${fraudFlags.join(", ")}`
            );

            console.log("Fraud detected:", fraudFlags);
            return;
        }

        // ==============================
        // 4️⃣ Double Entry Ledger
        // ==============================

        const ledgerEntries = [
            {
                business_id: transaction.business_id,
                account_type: "cash",
                entry_type: "DEBIT",
                amount: transaction.amount,
                reference: transactionId,
                created_at: new Date()
            },
            {
                business_id: transaction.business_id,
                account_type: "revenue",
                entry_type: "CREDIT",
                amount: transaction.amount,
                reference: transactionId,
                created_at: new Date()
            }
        ];

        const { error: ledgerError } = await supabase
            .from("ledger_entries")
            .insert(ledgerEntries);

        if (ledgerError) {
            throw ledgerError;
        }

        // ==============================
        // 5️⃣ Mark as Posted
        // ==============================

        await supabase
            .from("stk_transactions")
            .update({
                ledger_posted: true,
                processing_lock: false,
                updated_at: new Date()
            })
            .eq("id", transactionId);

        // ==============================
        // 6️⃣ Audit Log
        // ==============================

        await createAuditLog(
            transaction.business_id,
            "STK_PAYMENT_SUCCESS",
            `Ledger posted for transaction ${transactionId}`
        );

        console.log("Ledger posted successfully.");

    } catch (err) {

        console.error("Ledger processing failed:", err.message);

        await unlockTransaction(transactionId);

        throw err;
    }
}

/*
=====================================
Helper: Unlock Transaction
=====================================
*/

async function unlockTransaction(transactionId) {
    await supabase
        .from("stk_transactions")
        .update({ processing_lock: false })
        .eq("id", transactionId);
}

module.exports = { processStkPayment };