const { paymentQueue } = require("../config/queue");
const { processStkPayment } = require("../services/paymentService");

paymentQueue.process(async (job) => {

    const { transactionId } = job.data;

    await processStkPayment(transactionId);

});