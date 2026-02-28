const supabase = require("../config/supabase");

const VALIDATION_INTERVAL_MS = 5 * 60 * 1000;

/*
============================================
LEDGER INTEGRITY VALIDATOR
============================================
*/

async function validateLedgerIntegrity() {
    try {

        const { data: businesses } = await supabase
            .from("businesses")
            .select("id");

        if (!businesses) return;

        for (const business of businesses) {

            /*
            ============================================
            SUM LEDGER CREDIT AND DEBIT
            ============================================
            */

            const { data: ledgerRows } = await supabase
                .from("ledger_entries")
                .select("credit,debit")
                .eq("business_id", business.id);

            if (!ledgerRows) continue;

            let totalCredit = 0;
            let totalDebit = 0;

            for (const row of ledgerRows) {
                totalCredit += Number(row.credit || 0);
                totalDebit += Number(row.debit || 0);
            }

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
            ANOMALY DETECTION SIGNAL
            ============================================
            */

            const drift = Math.abs(ledgerNet - walletBalance);

            if (drift > 0.01) {
                console.error(
                    `Ledger anomaly detected for business ${business.id}`
                );

                await supabase
                    .from("audit_logs")
                    .insert({
                        business_id: business.id,
                        action: "LEDGER_DRIFT_ALERT",
                        description: `Ledger drift detected. Drift=${drift}`
                    });
            }
        }

    } catch (err) {
        console.error("Ledger validator error:", err.message);
    }
}

/*
============================================
VALIDATION LOOP
============================================
*/

setInterval(validateLedgerIntegrity, VALIDATION_INTERVAL_MS);

module.exports = {};