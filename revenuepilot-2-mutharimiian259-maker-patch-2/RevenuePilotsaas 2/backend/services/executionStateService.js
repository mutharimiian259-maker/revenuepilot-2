const ALLOWED_TRANSITIONS = {
    INITIATED: ["FRAUD_CHECKED"],
    FRAUD_CHECKED: ["LOCKED"],
    LOCKED: ["PUSH_SENT"],
    PUSH_SENT: ["CALLBACK_PENDING"],
    CALLBACK_PENDING: ["SUCCESS_SETTLED", "FAILED"],
    SUCCESS_SETTLED: ["LEDGER_CONFIRMED"],
    LEDGER_CONFIRMED: ["RELEASED"],
    FAILED: []
};

function validateStateTransition(currentState, nextState) {

    if (!ALLOWED_TRANSITIONS[currentState]) {
        throw new Error("Invalid execution state");
    }

    if (!ALLOWED_TRANSITIONS[currentState].includes(nextState)) {
        throw new Error(
            `Illegal state transition ${currentState} → ${nextState}`
        );
    }

    return true;
}

module.exports = {
    validateStateTransition
};