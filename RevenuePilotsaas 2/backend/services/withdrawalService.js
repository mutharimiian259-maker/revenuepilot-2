const supabase = require("../config/supabase");
const { createLedgerEntries } = require("./ledgerService");

/*
==========================================
Withdrawal Processing Engine
==========================================
Handles:
- Wallet validation
- Locking mechanism
- Payment execution pipeline
==========================================
*/

async function processWithdrawal(withdrawalId) {

    // Lock withdrawal request
    const { data: withdrawal } = await supabase
        .from("withdrawals")
        .update({ processing_lock: true })
        .eq("id", withdrawalId)
        .eq("status", "PENDING")
        .select()
        .single();

    if (!withdrawal) {
        console.log("Withdrawal already processed or locked.");
        return;
    }

    try {

        // Get wallet balance
        const { data: wallet } = await supabase
            .from("wallets")
            .select("*")
            .eq("business_id", withdrawal.business_id)
            .single();

        if (!wallet || wallet.balance < withdrawal.amount) {
            throw new Error("Insufficient wallet balance");
        }

        // TODO: Integrate Mpesa B2C API here
        console.log("Processing Mpesa withdrawal payout...");

        // Update wallet balance
        await supabase.rpc("decrement_wallet_balance", {
            business_id_input: withdrawal.business_id,
            amount_input: withdrawal.amount
        });

        // Mark withdrawal complete
        await supabase
            .from("withdrawals")
            .update({
                status: "SUCCESS",
                processing_lock: false
            })
            .eq("id", withdrawalId);

        console.log("Withdrawal processed successfully.");

    } catch (err) {

        console.error("Withdrawal failed:", err.message);

        await supabase
            .from("withdrawals")
            .update({
                status: "FAILED",
                processing_lock: false
            })
            .eq("id", withdrawalId);

        throw err;
    }
}

module.exports = { processWithdrawal };