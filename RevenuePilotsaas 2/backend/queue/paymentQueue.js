const queue = [];

async function enqueuePayment(task){
    queue.push(task);
}

async function processQueue(){

    while(queue.length > 0){

        const task = queue.shift();

        try{
            await task();
        }catch(err){
            console.error("Queue processing error", err);
        }
    }
}

setInterval(processQueue, 3000);

module.exports = { enqueuePayment };