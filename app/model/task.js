/**
 * Model definition for Data object task.
 * Needs to be able to handle a single incoming data object
 * or a nice set of parameters.
 */
var exports = module.exports = Task;

function Task(taskData) {
    var payload, operation, respondTo;

    payload = taskData.payload;
    operation = taskData.operation;
    respondTo = taskData.respondTo;

    function verify() {
        var isValid = 1;
        isValid &= isString(operation); 
        isValid &= operation.length > 0;
        isValid &= isString(respondTo);
        isValid &= respondTo.length > 0;

        try {
            if (!isString(payload)) {
                JSON.stringify(payload);
            }
        } catch (err) {
            isValid &= 0;
        }

        return isValid;
    }

    if (verify()) {
        return {
            verify: verify,
            operation: operation,
            respondTo: respondTo,
            payload: payload
        }
    } else {
        return null;
    }
};

function isString(ob) {
    return (typeof ob == 'string' || ob instanceof String);
}
