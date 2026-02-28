const crypto = require("crypto");
const supabase = require("../config/supabase");

async function postLedgerEntryChain(transaction) {

    if (transaction.ledger_posted) return;

    /*
    ============================================
    FETCH LAST CHAIN HASH FOR BUSINESS
    ============================================
    */

    const { data: lastLedger } = await supabase
        .from("ledger_entries")
        .select("chain_hash")
        .eq("business_id", transaction.business_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const previousChainHash = lastLedger?.chain_hash || "GENESIS_NODE";

    /*
    ============================================
    BUILD NEW CHAIN HASH
    ============================================
    */

    const payload = `${transaction.id}|${transaction.amount}|${transaction.business_id}|${previousChainHash}`;

    const chainHash = crypto
        .createHash("sha256")
        .update(payload)
        .digest("hex");

    /*
    ============================================
    INSERT AUDIT LEDGER ENTRY
    ============================================
    */

    const { error: ledgerError } = await supabase
        .from("ledger_entries")
        .insert({
            business_id: transaction.business_id,
            transaction_id: transaction.id,
            description: "Revenue posting",
            credit: transaction.amount,
            chain_hash: chainHash,
            integrity_hash: crypto
                .createHash("sha256")
                .update(payload)
                .digest("hex"),
            processing_note: "worker_chain_post"
        });

    if (ledgerError) {
        console.error("Ledger chain post error:", ledgerError.message);
        throw ledgerError;
    }

    /*
    ============================================
    MARK TRANSACTION SAFE
    ============================================
    */

    await supabase
        .from("stk_transactions")
        .update({
            ledger_posted: true
        })
        .eq("id", transaction.id);
}

module.exports = {
    postLedgerEntryChain
};