'use strict';
var AWS = require('aws-sdk');
var config;

var Promise = require('bluebird');

module.exports = function awsMsgr(awsConfig) {
    config = awsConfig;

    var qpfx; // Queues and topics may need a prefix to make them safe in a shared environment
    var tpcpfx;

    var sqs_connection = config.sqs_connection;
    var sns_connection = config.sns_connection;

    var sqs, sns, auth;

    if (sqs_connection) { // SQS DTO
        auth = {
            endpoint: sqs_connection.endpoint,
            region: sqs_connection.region,
            accessKeyId: sqs_connection.accessKey,
            secretAccessKey: sqs_connection.secretKey
        };
        sqs = new AWS.SQS(auth);
        sqs.receiveMessage = Promise.promisify(sqs.receiveMessage);
        sqs.sendMessage = Promise.promisify(sqs.sendMessage);
        sqs.deleteMessage = Promise.promisify(sqs.deleteMessage);
        sqs.createQueue = Promise.promisify(sqs.createQueue);
        sqs.addPermission = Promise.promisify(sqs.addPermission);
        sqs.deleteQueue = Promise.promisify(sqs.deleteQueue);
        sqs.listQueues = Promise.promisify(sqs.listQueues);
        qpfx = config.sqs_connection.queuePrefix || '';

    } else { // Dummy failover
		sqs = {};
        sqs.receiveMessage = sqs.sendMessage = args =>
            Promise.reject("SQS No Connection Config");
    }

    if (sns_connection) { // SNS DTO
        sns = new AWS.SNS(sns_connection);
        sns.receiveMessage = Promise.promisify(sns.subscribe);
        sns.sendMessage = Promise.promisify(sns.publish);
        tpcpfx = config.sns_connection.topicPrefix || '';
    } else { // Dummy failover
		sns = {};
        sns.receiveMessage = sns.sendMessage = args =>
            Promise.reject("SNS No Connection Config");
    }

    return { // Exposed API
        requestTask: requestSQS,
        publishTask: publishSQS,
        openChannel: negotiateQueue,
        listChannels: listQueues,
        requestResponse: requestSNS,
        publishResponse: publishSNS
    };


    /*
     * Non-blocking requests to SQS
     * Processes up to 100 a second.
     */
    function requestSQS(queue) {
        if (queue === undefined) {
            queue = sqs_connection.queue;
        }
        var endpoint = sqs_connection.endpoint;
        var userId = sqs_connection.userId;

        var requestPromise = sqs.receiveMessage({
                QueueUrl: [endpoint, userId, queue].join('/'),
                MessageAttributeNames: ['operation', 'respondTo', 'timestamp'],
                WaitTimeSeconds: 2,
                MaxNumberOfMessages: 1
            })
            .then(data => {
                if (data.Messages && data.Messages.length > 0) {
                    acknowledgeSQS(data.Messages[0].ReceiptHandle, queue);
                    return processSQSInMessage(data);
                } else {
                    return null;
                }
            });
        return requestPromise;
    }

    /**
     * Upon message receipt, send back an acknowledge message.
     */
    function acknowledgeSQS(receiptHandle, queue) {
        if (queue === undefined) {
            queue = sqs_connection.queue;
        }
        var endpoint = sqs_connection.endpoint;
        var userId = sqs_connection.userId;

        var acknowledgePromise = sqs.deleteMessage({
                QueueUrl: [endpoint, userId, queue].join('/'),
                ReceiptHandle: receiptHandle
            })
            .catch(err => {
                console.log(err)
            });
    }

    /**
     * Return Utility success/fail response to SQS
     */
    function publishSQS(operation, respondTo, payload, queue) {
        if (queue === undefined) {
            queue = sqs_connection.queue;
        }
        var endpoint = sqs_connection.endpoint;
        var userId = sqs_connection.userId;

        return sqs.sendMessage({
            QueueUrl: [endpoint, userId, queue].join('/'),
            MessageBody: payload,
            MessageAttributes: {
                operation: {
                    DataType: 'String',
                    StringValue: operation
                },
                respondTo: {
                    DataType: 'String',
                    StringValue: respondTo
                }
            }
        });
    }

    /**
     * Get a list of all AWS SQS queues for the user
     */
    function listQueues() {
        return sqs.listQueues({
            // QueueNamePrefix: ''
        });
    }

    /**
     * Open an SQS Queue and grant access to another user
     */
    function negotiateQueue(queue, conspirator) {
        var endpoint = sqs_connection.endpoint;
        var userId = sqs_connection.userId;

        return sqs.createQueue({
                QueueName: queue,
                Attributes: {
                    MessageRetentionPeriod: '3600' // Keep for an hour.
                }
            })
            .then(function () {
                if (conspirator === undefined) {
                    return true;
                }
                return sqs.addPermission({
                    AWSAccountIds: [conspirator],
                    Actions: ['SendMessage', 'ReceiveMessage'],
                    Label: 'SERVICE',
                    QueueUrl: [endpoint, userId, queue].join('/')
                })
            });
    }

    /**
     * Delete an SNS Queue that is older than an hour
     */
    function expireQueue(queue) {
        if (queue === undefined) {
            return; // Don't delete the primary queue!!!
        }
        var endpoint = sqs_connection.endpoint;
        var userId = sqs_connection.userId;

        return sqs.getQueueAttributes({
                QueueUrl: [endpoint, userId, queue].join('/'),
                AttributeNames: [
                'CreatedTimestamp'
            ]
            })
            .then(function (queueAttributes) {
                if (queueAttributes.CreatedTimestamp > new Date()) {
                    return Promise.reject("Queue is not expired yet.");
                }
                return sqs.deleteQueue({
                    QueueUrl: sqs_connection.endpoint + '/' + queue
                });


            });
    }

    /*
     * Non-blocking requests to SNS
     * Processes up to 100 a second.
     */
    function requestSNS(topic) {
        var requestPromise = sns.receiveMessage({
                endpoint: sns_connection.endpoint,
                topic: topic,
                WaitTimeSeconds: 3,
                MaxNumberOfMessages: 10,
                VisibilityTimeout: 10
            })
            .then(function (data) {
                return processMessage(data);
            });
        return requestPromise;
    }

    /**
     * Return Utility success/fail response to SNS
     */
    function publishSNS(operation, topic, payload) {
        return sns.sendMessage({
            Message: JSON.stringify(payload),
            MessageAttributes: {
                operation: {
                    DataType: 'String',
                    StringValue: operation
                }
            },
            Subject: "Testing SNS",
            TopicArn: topic
        });
    }

    /**
     * Maps SQS message to a generic object
     * This is in case we need a different message delivery solution.
     */
    function processSQSInMessage(sqsMsg) {
        var taskRequest;
        try {
            taskRequest = {
                payload: JSON.parse(sqsMsg.Messages[0].Body),
                operation: sqsMsg.Messages[0].MessageAttributes.operation.StringValue,
                respondTo: sqsMsg.Messages[0].MessageAttributes.respondTo.StringValue
            };
        } catch (err) {
            taskRequest = null;
        }

        return taskRequest;
    }

    /**
     * Maps SNS message to a generic object
     * This is in case we need a different message delivery solution.
     * NOT IMPLEMENTED
     */
    function processSNSInMessage(snsMsg) {

    }

    /**
     * Maps SQS message from a Task
     * This is in case we need a different message delivery solution.
     * NOT IMPLEMENTED
     */
    function processSQSOutMessage(taskModel) {
        var sqsMsg;
        try {
            sqsMsg = {

            }
        } catch (err) {

        }
    }

    /**
     * Maps SNS message from a Response
     * This is in case we need a different message delivery solution.
     * NOT IMPLEMENTED
     */
    function processSNSOutMessage(responseModel) {

    }

}
