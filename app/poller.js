'use strict';

var utility = require('./utilFactory');
var task = require('./model/task');
var config = require('../config/config');
var pollPlugin = require('./awsMessenger')(config);

module.exports = poller();

function poller() {
    var listenPollId = null;

    var resolvedQueue = {};
    var inProgress = false;
    return {
        startPolling: startPolling,
        stopPolling: stopPolling
    };

    function startPolling() {
        inProgress = false;
        if (listenPollId === null) {
            listenPollId = setInterval(pollMessage, 100);
        }
    }

    function stopPolling() {
        if (listenPollId !== null) {
            clearInterval(listenPollId);
        }
    }

    /*
     * Non-blocking requests to SQS
     * Processes up to 100 a second.
     */
    function pollMessage() {
        if (inProgress) return;
        inProgress = true;
        var taskRequest;
        pollPlugin.requestTask()
            .then(function (data) {
                inProgress = false; // Free up poller on response. 
                if (data) { // not a very robust test
                    console.log(data);
                    taskRequest = task(data);
                }

                if (taskRequest) {
                    console.log(taskRequest);
                    return utility.submitTask(taskRequest);
                } else return Promise.reject("Invalid Task Data");
            })
            .then(function (response) {
                var queueConfirm = config.sqs_connection.queue;
                pollPlugin.publishTask(taskRequest.operation,
                    queueConfirm,
                    JSON.stringify(response),
                    taskRequest.respondTo);
            })
            .catch(err => {
                inProgress = false;
            });
    }

    /**
     * Return Utility success/fail response to SQS
     */
    function sendResponse(outgoingTopic) {
        pollPlugin.sendMessage({
            QueueUrl: outgoingTopic
        });
    }
}
