const supabase = require("../config/supabase");
const { executeBarrierCheck } = require("./executionBarrierGateway");

async function settleSuccessfulTransaction(transactionId) {

    const { data: transaction } = await supabase
        .from("stk_transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

    if (!transaction) {
        throw new Error("Transaction not found");
    }

    /*
    ============================================
    ANTI-CORRUPTION BARRIER CHECK
    ============================================
    */

    await executeBarrierCheck(transaction, "SUCCESS_SETTLED");

    /*
    ============================================
    STATE MACHINE UPDATE
    ============================================
    */

    await supabase
        .from("stk_transactions")
        .update({
            execution_state: "SUCCESS_SETTLED",
            status: "SUCCESS"
        })
        .eq("id", transaction.id);

    return true;
}

module.exports = {
    settleSuccessfulTransaction
};