const supabase = require("../config/supabase");

const WORKER_NAME = "payment_core_worker";
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

/*
============================================
HEARTBEAT REGISTRATION
============================================
*/

async function sendHeartbeat() {
    try {

        await supabase
            .from("worker_heartbeat_registry")
            .upsert({
                worker_name: WORKER_NAME,
                last_seen: new Date().toISOString()
            }, {
                onConflict: "worker_name"
            });

    } catch (err) {
        console.error("Heartbeat worker error:", err.message);
    }
}

/*
============================================
HEARTBEAT LOOP
============================================
*/

setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

module.exports = {};