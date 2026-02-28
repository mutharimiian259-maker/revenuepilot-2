const supabase = require("../config/supabase");

const FAILED_ATTEMPT_WINDOW_MINUTES = 5;
const MAX_ATTEMPTS = 3;

async function runFraudChecks({ phone, amount, businessId }) {
    try {

        const windowStart = new Date(
            Date.now() - FAILED_ATTEMPT_WINDOW_MINUTES * 60 * 1000
        );

        /*
        ============================================
        MULTIPLE FAILED PAYMENT DETECTION
        ============================================
        */

        const { data: failedPayments } = await supabase
            .from("stk_transactions")
            .select("id")
            .eq("phone", phone)
            .eq("status", "FAILED")
            .gte("created_at", windowStart.toISOString());

        if (failedPayments && failedPayments.length >= MAX_ATTEMPTS) {
            return {
                risk: true,
                flag: "MULTIPLE_FAILED_ATTEMPTS"
            };
        }

        return {
            risk: false
        };

    } catch (err) {
        console.error("Fraud engine error:", err.message);

        return {
            risk: true,
            flag: "ENGINE_ERROR"
        };
    }
}

module.exports = {
    runFraudChecks
};