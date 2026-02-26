async function createLedgerEntries(transaction){

    const totalDebit = transaction.amount;
    const totalCredit = transaction.amount;

    if(totalDebit !== totalCredit){
        throw new Error("Ledger imbalance detected");
    }

    await supabase.from("ledger_entries").insert([
        {
            business_id:transaction.business_id,
            transaction_id:transaction.id,
            entry_type:"DEBIT",
            amount:transaction.amount
        },
        {
            business_id:transaction.business_id,
            transaction_id:transaction.id,
            entry_type:"CREDIT",
            amount:transaction.amount
        }
    ]);
}