const supabase = require("../config/supabase");

const RECONCILIATION_INTERVAL_MS = 3 * 60 * 1000;

/*
============================================
RECONCILIATION DRIFT DETECTOR
============================================
*/

async function reconcileFinancialState() {
    try {

        const { data: businesses } = await supabase
            .from("businesses")
            .select("id");

        if (!businesses) return;

        for (const business of businesses) {

            /*
            ============================================
            CALCULATE LEDGER TOTALS
            ============================================
            */

            const { data: ledgerRows } = await supabase
                .from("ledger_entries")
                .select("credit,debit")
                .eq("business_id", business.id);

            let totalCredit = 0;
            let totalDebit = 0;

            ledgerRows?.forEach(row => {
                totalCredit += Number(row.credit || 0);
                totalDebit += Number(row.debit || 0);
            });

            const ledgerNet = totalCredit - totalDebit;

            /*
            ============================================
            FETCH WALLET BALANCE
            ============================================
            */

            const { data: wallet } = await supabase
                .from("wallets")
                .select("balance")
                .eq("business_id", business.id)
                .single();

            const walletBalance = wallet?.balance || 0;

            /*
            ============================================
            DRIFT DETECTION ONLY (NO MUTATION)
            ============================================
            */

            const drift = ledgerNet - walletBalance;

            if (Math.abs(drift) > 0.01) {

                await supabase
                    .from("audit_logs")
                    .insert({
                        business_id: business.id,
                        action: "RECONCILIATION_DRIFT_ALERT",
                        description: `Financial drift detected. Drift = ${drift}`
                    });
            }
        }

    } catch (err) {
        console.error("Reconciliation worker error:", err.message);
    }
}

/*
============================================
WORKER LOOP
============================================
*/

setInterval(reconcileFinancialState, RECONCILIATION_INTERVAL_MS);

module.exports = {};