const supabase = require("../config/supabase");
const { createAuditLog } = require("./auditService");

async function processStkPayment(transactionId) {

    // 🔒 Lock transaction first
    const { data: transaction, error } = await supabase
        .from("stk_transactions")
        .update({ processing_lock: true })
        .eq("id", transactionId)
        .eq("ledger_posted", false)
        .select()
        .single();

    if (error || !transaction) {
        console.log("Already processed or locked");
        return;
    }

    try {

        if (transaction.status !== "SUCCESS") {
            return;
        }

        // ✅ Double-entry example
        await supabase.from("ledger_entries").insert([
            {
                business_id: transaction.business_id,
                account_type: "cash",
                amount: transaction.amount,
                entry_type: "DEBIT"
            },
            {
                business_id: transaction.business_id,
                account_type: "revenue",
                amount: transaction.amount,
                entry_type: "CREDIT"
            }
        ]);

        // ✅ Mark ledger as posted
        await supabase
            .from("stk_transactions")
            .update({
                ledger_posted: true,
                processing_lock: false
            })
            .eq("id", transactionId);

        await createAuditLog(
            transaction.business_id,
            "STK_PAYMENT_SUCCESS",
            `Ledger posted for transaction ${transactionId}`
        );

    } catch (err) {

        // ❌ Unlock on failure
        await supabase
            .from("stk_transactions")
            .update({ processing_lock: false })
            .eq("id", transactionId);

        throw err;
    }
}

module.exports = { processStkPayment };