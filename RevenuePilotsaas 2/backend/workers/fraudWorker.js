const cron = require("node-cron");
const supabase = require("../config/supabase");

cron.schedule("*/2 * * * *", async () => {

    const { data } = await supabase
        .from("stk_transactions")
        .select("*")
        .eq("status", "FLAGGED");

    for (const tx of data || []) {

        console.log("Monitoring flagged transaction:", tx.id);

    }
});