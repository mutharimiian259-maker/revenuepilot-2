const supabase = require("../config/supabase");

/*
=====================================
Enterprise Fraud Detection Engine
=====================================
*/

async function runFraudChecks(transaction) {

    if (!transaction) return [];

    const flags = [];

    const amount = Number(transaction.amount);

    /*
    ===============================
    High Amount Spike Detection
    ===============================
    */

    if (amount > 100000) {
        flags.push("HIGH_AMOUNT");
    }

    /*
    ===============================
    Rate Spike Detection (1 Minute Window)
    ===============================
    */

    const oneMinuteAgo = new Date(Date.now() - 60000);

    const { count: paymentCount } = await supabase
        .from("stk_transactions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", transaction.business_id)
        .gte("created_at", oneMinuteAgo);

    if (paymentCount && paymentCount > 5) {
        flags.push("RATE_SPIKE");
    }

    /*
    ===============================
    Phone Spam Detection
    ===============================
    */

    const { count: phoneCount } = await supabase
        .from("stk_transactions")
        .select("id", { count: "exact", head: true })
        .eq("phone", transaction.phone)
        .gte("created_at", oneMinuteAgo);

    if (phoneCount && phoneCount > 3) {
        flags.push("PHONE_SPAM");
    }

    return flags;
}

module.exports = { runFraudChecks };