const supabase = require("../config/supabase");
const { createAuditLog } = require("./auditService");

async function runReconciliation() {

    // Get successful but unreconciled transactions
    const { data: transactions, error } = await supabase
        .from("stk_transactions")
        .select("*")
        .eq("status", "SUCCESS")
        .eq("reconciled", false);

    if (error) throw error;

    for (const tx of transactions) {

        // Check ledger entries
        const { data: ledgerEntries } = await supabase
            .from("ledger_entries")
            .select("*")
            .eq("reference", tx.id);

        if (!ledgerEntries || ledgerEntries.length !== 2) {

            await supabase
                .from("stk_transactions")
                .update({
                    reconciliation_note: "Ledger entries missing",
                })
                .eq("id", tx.id);

            continue;
        }

        const totalDebit = ledgerEntries
            .filter(e => e.entry_type === "DEBIT")
            .reduce((sum, e) => sum + Number(e.amount), 0);

        const totalCredit = ledgerEntries
            .filter(e => e.entry_type === "CREDIT")
            .reduce((sum, e) => sum + Number(e.amount), 0);

        // Check double entry balance
        if (totalDebit !== totalCredit || totalDebit !== Number(tx.amount)) {

            await supabase
                .from("stk_transactions")
                .update({
                    reconciliation_note: "Ledger mismatch detected",
                })
                .eq("id", tx.id);

            await createAuditLog(
                tx.business_id,
                "RECONCILIATION_FAILED",
                `Mismatch on transaction ${tx.id}`
            );

            continue;
        }

        // If everything correct → mark reconciled
        await supabase
            .from("stk_transactions")
            .update({
                reconciled: true,
                reconciliation_note: "OK"
            })
            .eq("id", tx.id);

        await createAuditLog(
            tx.business_id,
            "RECONCILIATION_SUCCESS",
            `Transaction ${tx.id} reconciled`
        );
    }

    console.log("Reconciliation completed.");
}

module.exports = { runReconciliation };