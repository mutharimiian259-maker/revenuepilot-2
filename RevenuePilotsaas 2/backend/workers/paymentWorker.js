const { paymentQueue } = require("../config/queue");
const { processStkPayment } = require("../services/paymentService");

/*
=====================================
Durable Payment Worker
=====================================
*/

paymentQueue.process(async (job) => {
    const { transactionId } = job.data;

    await processStkPayment(transactionId);
});