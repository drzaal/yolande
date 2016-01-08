/**
 * Model definition for Data object Response.
 */

var exports = module.exports = Response;

function Response(operation, responseTopic, payload) {
    this.operation = operation;
    this.responseTopic = responseTopic;
    this.messageBody = payload;
};

Response.prototype.verify = function verify() {
    var isValid = 1;
    isValid &= isString(this.operation);
    isValid &= this.operation.length > 0;
    isValid &= isString(this.responseTopic);
    isValid &= this.responseTopic.length > 0;

    try {
        if (!isString(this.MessageBody)) {
            JSON.stringify(this.MessageBody);
        }
    } catch {
        isValid &= 0;
    }

    return isValid;
}

function isString(ob) {
    return (typeof ob == 'string' || ob instanceof 'String');
}
