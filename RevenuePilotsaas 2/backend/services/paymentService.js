const supabase = require("../config/supabase");
const { createAuditLog } = require("./auditService");
const { runFraudChecks } = require("./fraudService");

/*
========================================
ENTERPRISE STK PAYMENT PROCESSOR
========================================
Features:
✔ Atomic lock
✔ Fraud detection
✔ Idempotent ledger posting
✔ Double-entry accounting
✔ Safe unlock on failure
✔ Database-level duplicate protection
========================================
*/

async function processStkPayment(transactionId) {

    // =====================================
    // 1️⃣ Atomic Lock
    // =====================================

    const { data: transaction, error: lockError } = await supabase
        .from("stk_transactions")
        .update({ processing_lock: true })
        .eq("id", transactionId)
        .eq("ledger_posted", false)
        .eq("processing_lock", false)
        .select()
        .maybeSingle();

    if (!transaction || lockError) {
        console.log("Transaction already processed, locked, or not found.");
        return;
    }

    try {

        // =====================================
        // 2️⃣ Only Process SUCCESS
        // =====================================

        if (transaction.status !== "SUCCESS") {
            await unlockTransaction(transactionId);
            return;
        }

        // =====================================
        // 3️⃣ Fraud Checks
        // =====================================

        const fraudFlags = await runFraudChecks(transaction);

        if (fraudFlags.length > 0) {

            await supabase
                .from("stk_transactions")
                .update({
                    status: "FLAGGED",
                    fraud_flags: fraudFlags,
                    processing_lock: false
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

        // =====================================
        // 4️⃣ Prepare Double Entry Ledger
        // =====================================

        const ledgerEntries = [
            {
                business_id: transaction.business_id,
                account_type: "cash",
                entry_type: "DEBIT",
                amount: transaction.amount,
                reference_id: transactionId,
                reference_type: "STK",
                created_at: new Date()
            },
            {
                business_id: transaction.business_id,
                account_type: "revenue",
                entry_type: "CREDIT",
                amount: transaction.amount,
                reference_id: transactionId,
                reference_type: "STK",
                created_at: new Date()
            }
        ];

        // =====================================
        // 5️⃣ Insert Ledger (Idempotent Safe)
        // =====================================

        const { data: inserted, error: ledgerError } = await supabase
            .from("ledger_entries")
            .insert(ledgerEntries)
            .select();

        if (ledgerError) {
            // If duplicate (unique index violation), assume already posted
            if (ledgerError.code === "23505") {
                console.log("Ledger already posted (duplicate prevented).");
            } else {
                throw ledgerError;
            }
        }

        // Integrity check
        if (inserted && inserted.length !== 2) {
            throw new Error("Ledger integrity failure.");
        }

        // =====================================
        // 6️⃣ Mark Transaction Posted
        // =====================================

        await supabase
            .from("stk_transactions")
            .update({
                ledger_posted: true,
                processing_lock: false,
                updated_at: new Date()
            })
            .eq("id", transactionId);

        // =====================================
        // 7️⃣ Audit Log
        // =====================================

        await createAuditLog(
            transaction.business_id,
            "STK_PAYMENT_SUCCESS",
            `Ledger posted for transaction ${transactionId}`
        );

        console.log("STK Payment fully processed.");

    } catch (err) {

        console.error("Processing failed:", err.message);

        await unlockTransaction(transactionId);

        throw err;
    }
}

// =====================================
// Helper: Unlock Transaction
// =====================================

async function unlockTransaction(transactionId) {
    await supabase
        .from("stk_transactions")
        .update({ processing_lock: false })
        .eq("id", transactionId);
}

module.exports = { processStkPayment };