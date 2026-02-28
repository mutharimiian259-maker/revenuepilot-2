const supabase = require("../config/supabase");

/*
==========================================
Subscription Billing Engine
==========================================
Responsibilities:
- Auto billing execution
- Wallet charge
- Duplicate billing protection
==========================================
*/

async function processSubscriptions() {

    const today = new Date();

    const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("status", "ACTIVE")
        .lte("next_billing_date", today)
        .eq("processing_lock", false);

    if (!subscriptions) return;

    for (const sub of subscriptions) {

        try {

            // Lock subscription
            await supabase
                .from("subscriptions")
                .update({ processing_lock: true })
                .eq("id", sub.id);

            // Get wallet
            const { data: wallet } = await supabase
                .from("wallets")
                .select("*")
                .eq("business_id", sub.business_id)
                .single();

            if (!wallet || wallet.balance < sub.billing_amount) {
                console.log("Subscription skipped: insufficient wallet balance");

                await supabase
                    .from("subscriptions")
                    .update({
                        processing_lock: false
                    })
                    .eq("id", sub.id);

                continue;
            }

            // Charge wallet
            await supabase.rpc("decrement_wallet_balance", {
                business_id_input: sub.business_id,
                amount_input: sub.billing_amount
            });

            // Update billing schedule
            const nextDate = new Date();
            nextDate.setMonth(nextDate.getMonth() + 1);

            await supabase
                .from("subscriptions")
                .update({
                    next_billing_date: nextDate,
                    processing_lock: false
                })
                .eq("id", sub.id);

            console.log("Subscription billed:", sub.business_id);

        } catch (err) {

            console.error("Subscription billing error:", err.message);

            await supabase
                .from("subscriptions")
                .update({
                    processing_lock: false
                })
                .eq("id", sub.id);
        }
    }
}

module.exports = { processSubscriptions };