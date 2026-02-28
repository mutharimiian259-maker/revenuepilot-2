const crypto = require("crypto");
const supabase = require("../config/supabase");
const { runFraudChecks } = require("./fraudService");
const { isPaymentLocked } = require("./platformControlService");

/*
============================================
HASH GENERATOR (IDEMPOTENCY CORE)
============================================
*/

function generateProcessingHash(phone, amount, businessId) {
    const timeWindow = Math.floor(Date.now() / (1000 * 60));

    return crypto
        .createHash("sha256")
        .update(`${phone}-${amount}-${businessId}-${timeWindow}`)
        .digest("hex");
}

/*
============================================
STK PAYMENT INITIATION SERVICE
============================================
*/

async function initiateStkPayment(req, res) {
    try {
        const { phone, amount, businessId, employeeId, customerId } = req.body;

        if (!phone || !amount || !businessId) {
            return res.status(400).json({
                status: "error",
                message: "Missing required fields"
            });
        }

        /*
        ============================================
        GLOBAL PLATFORM LOCK CHECK
        ============================================
        */

        if (await isPaymentLocked()) {
            return res.status(503).json({
                status: "error",
                message: "Platform payment services temporarily disabled"
            });
        }

        /*
        ============================================
        FRAUD INTELLIGENCE CHECK
        ============================================
        */

        const fraudResult = await runFraudChecks({
            phone,
            amount,
            businessId
        });

        if (fraudResult?.risk) {
            return res.status(403).json({
                status: "error",
                message: "Transaction blocked due to risk policy"
            });
        }

        /*
        ============================================
        IDEMPOTENCY HASH
        ============================================
        */

        const processingHash = generateProcessingHash(
            phone,
            amount,
            businessId
        );

        /*
        ============================================
        ATOMIC TRANSACTION INSERT
        ============================================
        */

        const { data, error } = await supabase
            .from("stk_transactions")
            .insert({
                business_id: businessId,
                employee_id: employeeId || null,
                customer_id: customerId || null,
                phone,
                amount,
                status: "PENDING",
                processing_hash: processingHash,
                processing_lock: true,
                lock_expires_at: new Date(Date.now() + 5 * 60 * 1000),
                execution_state: "INITIATED"
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({
                    status: "error",
                    message: "Duplicate payment attempt detected"
                });
            }

            throw error;
        }

        /*
        ============================================
        TODO: INTEGRATE M-PESA STK PUSH HERE
        ============================================
        */

        return res.status(200).json({
            status: "success",
            message: "STK push initiated",
            transactionId: data.id
        });

    } catch (err) {
        console.error("STK INIT ERROR:", err.message);

        return res.status(500).json({
            status: "error",
            message: "Payment initiation failed"
        });
    }
}

module.exports = {
    initiateStkPayment
};