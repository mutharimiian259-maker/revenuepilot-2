const supabase = require("../config/supabase");

async function runFraudChecks(transaction) {

    const flags = [];

    // Rule 1: High Amount Spike
    if (transaction.amount > 100000) {
        flags.push("HIGH_AMOUNT");
    }

    // Rule 2: Too Many Payments in 1 Minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const { count } = await supabase
        .from("stk_transactions")
        .select("*", { count: "exact", head: true })
        .eq("business_id", transaction.business_id)
        .gte("created_at", oneMinuteAgo);

    if (count > 5) {
        flags.push("RATE_SPIKE");
    }

    // Rule 3: Repeated Phone Number Rapidly
    const { count: phoneCount } = await supabase
        .from("stk_transactions")
        .select("*", { count: "exact", head: true })
        .eq("phone", transaction.phone)
        .gte("created_at", oneMinuteAgo);

    if (phoneCount > 3) {
        flags.push("PHONE_SPAM");
    }

    return flags;
}

module.exports = { runFraudChecks };