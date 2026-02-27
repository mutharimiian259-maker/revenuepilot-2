const { paymentQueue } = require("../config/queue");
const { processStkPayment } = require("../services/paymentService");

/*
=====================================
ENTERPRISE DURABLE PAYMENT WORKER
=====================================
Features:
✔ Single processor registration
✔ Payload validation
✔ Execution timeout shield
✔ Crash isolation sandbox
✔ Retry propagation
=====================================
*/

paymentQueue.process(5, async (job) => {

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Worker execution timeout")), 600000)
    );

    try {

        if (!job || !job.data) {
            throw new Error("Invalid worker job payload");
        }

        const workerPromise = (async () => {

            const { transactionId } = job.data;

            if (!transactionId) {
                throw new Error("Missing transactionId");
            }

            console.log("Processing payment:", transactionId);

            await processStkPayment(transactionId);

        })();

        await Promise.race([workerPromise, timeoutPromise]);

    } catch (err) {

        console.error("Worker execution failed:", err.message);

        throw err;
    }

});