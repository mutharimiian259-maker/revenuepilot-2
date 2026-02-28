const supabase = require("../config/supabase");

/*
============================================
GLOBAL PAYMENT LOCK CHECK
============================================
*/

async function isPaymentLocked() {
    const { data } = await supabase
        .from("platform_control")
        .select("payment_global_lock")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    return data?.payment_global_lock === true;
}

module.exports = {
    isPaymentLocked
};