const supabase = require("../config/supabase");

async function enforceExecutionFirewall(transaction) {

    /*
    ============================================
    GLOBAL PAYMENT LOCK
    ============================================
    */

    const { data: control } = await supabase
        .from("platform_control")
        .select("payment_global_lock")
        .order("id", { ascending: false })
        .limit(1)
        .single();

    if (control?.payment_global_lock) {
        throw new Error("Platform execution locked");
    }

    /*
    ============================================
    HEARTBEAT VALIDATION
    ============================================
    */

    const { data: heartbeat } = await supabase
        .from("worker_heartbeat_registry")
        .select("*")
        .eq("worker_name", "payment_core_worker")
        .single();

    if (!heartbeat) {
        throw new Error("Worker heartbeat missing");
    }

    const heartbeatAge =
        Date.now() - new Date(heartbeat.last_seen).getTime();

    if (heartbeatAge > 120000) {
        throw new Error("Worker heartbeat stale");
    }

    /*
    ============================================
    FRAUD SIGNAL CHECK
    ============================================
    */

    if (transaction.fraud_flags?.length > 0) {
        throw new Error("Fraud policy violation");
    }

    /*
    ============================================
    LOCK EXPIRATION CHECK
    ============================================
    */

    if (
        transaction.lock_expires_at &&
        new Date(transaction.lock_expires_at) < new Date()
    ) {
        throw new Error("Transaction lock expired");
    }

    /*
    ============================================
    EXECUTION STATE SAFETY
    ============================================
    */

    if (transaction.execution_state === "FAILED") {
        throw new Error("Cannot execute failed transaction");
    }

    return true;
}

module.exports = {
    enforceExecutionFirewall
};