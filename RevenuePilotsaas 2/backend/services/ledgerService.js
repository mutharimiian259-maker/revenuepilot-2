const supabase = require("../config/supabase");

/*
=========================================
Enterprise Ledger Engine
=========================================
Responsibilities:
1. Validate transaction
2. Enforce debit = credit
3. Support commission split
4. Prevent duplicate posting
=========================================
*/

async function createLedgerEntries(transaction, options = {}) {

    if (!transaction) {
        throw new Error("Ledger transaction data missing");
    }

    const amount = Number(transaction.amount);

    if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid transaction amount");
    }

    const commissionPercent = options.commissionPercent || 0;
    const commissionAmount = amount * (commissionPercent / 100);
    const businessNet = amount - commissionAmount;

    // ===============================
    // Define Ledger Entries
    // ===============================

    const entries = [
        // Business cash increase (net amount)
        {
            business_id: transaction.business_id,
            reference: transaction.id,
            account_type: "cash",
            entry_type: "DEBIT",
            amount: businessNet,
            created_at: new Date()
        },

        // Business revenue full amount
        {
            business_id: transaction.business_id,
            reference: transaction.id,
            account_type: "revenue",
            entry_type: "CREDIT",
            amount: amount,
            created_at: new Date()
        }
    ];

    // Add commission entry if applicable
    if (commissionAmount > 0) {
        entries.push({
            business_id: transaction.business_id,
            reference: transaction.id,
            account_type: "platform_commission",
            entry_type: "CREDIT",
            amount: commissionAmount,
            created_at: new Date()
        });
    }

    // ===============================
    // Validate Double Entry Balance
    // ===============================

    const totalDebit = entries
        .filter(e => e.entry_type === "DEBIT")
        .reduce((sum, e) => sum + e.amount, 0);

    const totalCredit = entries
        .filter(e => e.entry_type === "CREDIT")
        .reduce((sum, e) => sum + e.amount, 0);

    if (Number(totalDebit.toFixed(2)) !== Number(totalCredit.toFixed(2))) {
        throw new Error("Ledger imbalance detected. Debit != Credit");
    }

    // ===============================
    // Prevent Duplicate Ledger Posting
    // ===============================

    const { count } = await supabase
        .from("ledger_entries")
        .select("*", { count: "exact", head: true })
        .eq("reference", transaction.id);

    if (count > 0) {
        console.log("Ledger already exists for this transaction.");
        return;
    }

    // ===============================
    // Insert Ledger Entries
    // ===============================

    const { error } = await supabase
        .from("ledger_entries")
        .insert(entries);

    if (error) {
        throw error;
    }

    console.log("Ledger entries created successfully.");
}

module.exports = { createLedgerEntries };