const retryTasks = [];

async function enqueueRetry(task) {
    retryTasks.push(task);
}

async function processRetries() {
    while (retryTasks.length > 0) {
        const task = retryTasks.shift();
        try {
            await task();
        } catch (err) {
            console.error("Retry failed again:", err.message);
        }
    }
}

setInterval(processRetries, 10000);

module.exports = { enqueueRetry };