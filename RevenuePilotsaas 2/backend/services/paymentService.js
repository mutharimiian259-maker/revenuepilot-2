const supabase = require("../config/supabase");
const { createLedgerEntries } = require("./ledgerService");

async function processStkPayment(transactionId){

    const { data } = await supabase
        .from("stk_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

    if(!data) return;

    const success = Math.random() > 0.3;

    await supabase
        .from("stk_transactions")
        .update({
            status: success ? "SUCCESS" : "FAILED"
        })
        .eq("id", transactionId);

    if(success){
        await createLedgerEntries(data);
    }
}

module.exports = { processStkPayment };