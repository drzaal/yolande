module.exports = function (config) {
    var express = require('express');
    var router = express.Router();
    var fs = require('fs');
    var Promise = require('bluebird');
    var config = require('../config/config');

    /* GET home page. */
    router.get('/', function (req, res) {
        res.send("Active");
        // res.render('index', { title: 'Express', name: config.name });
    });

    router.post('/test/:queue', function (req, res) {
        var queue = req.params.queue;
        var message;
        if (typeof req.body === 'string' || req.body instanceof String) {
            message = JSON.parse(req.body);
        } else {
            message = req.body;
        }
        console.log(message);

        var msgPlugin = require('../app/awsMessenger')(config);

        //msgPlugin.listChannels()
				Promise.resolve(1)
            .then(response => {
                return msgPlugin.openChannel(queue)
            })
            .then(function () {
                msgPlugin.publishTask("dnsLookup", message.respondTo,
                    JSON.stringify(message.machines), queue)
            })
            .then(function (data) {
                res.send(JSON.stringify(data));
            })
            .catch(function (err) {
                console.log("post operation");
                res.send(err.toString());
            });

        return;
        var sns = new AWS.SNS({});

        sns.createTopic({
            Name: "sns-default"
        });

        msgPlugin.publishResponse("dnsLookup", "sns-default",
            message.machines);
    });

    /* Get a message from SQS by queue */
    router.get('/test/:queue', function (req, res) {
        var queue = req.params.queue;
        var msgPlugin = require('../app/awsMessenger')(config);
        var task = require('../app/model/task');
        var utility = require('../app/utilFactory');
        var message;

        msgPlugin.requestTask(queue)
            .then(message => {
                console.log("get successful");
                res.send(JSON.stringify(message));

                if (message == null) {
                    return null;
                }
                return utility.submitTask(task({
                    operation: "dnsLookup",
                    payload: message.payload,
                    respondTo: message.respondTo
                }));
            })
            .then(response => console.log(response))
            .catch(function (err) {
                console.log("get operation", err);
                res.send("get failure");
            });
    });

    /* POST a message to SQS */
    router.post('/test', function (req, res) {
        var message;
        if (typeof req.body === 'string' || req.body instanceof String) {
            message = JSON.parse(req.body);
        } else {
            message = req.body;
        }
        console.log(message);

        var msgPlugin = require('../app/awsMessenger')(config);

        msgPlugin.publishTask("dnsLookup", message.respondTo,
                JSON.stringify(message.machines))
            .then(function (data) {
                res.send(JSON.stringify(data));
            })
            .catch(function (err) {
                console.log("post operation");
                res.send(err.toString());
            });

        return;
        var sns = new AWS.SNS({});

        sns.createTopic({
            Name: "sns-default"
        });

        msgPlugin.publishResponse("dnsLookup", "sns-default",
            message.machines);

    });

    /* Get queue configuration for Agent */
    router.get('/config', function (req, res) {
        var mqsConfig = require('../config/config').sqs_connection;
        var message, configOut;

        fs.readdir = Promise.promisify(fs.readdir);
        fs.readdir('./app/util')
            .then(utilities => utilities.map(a => a.replace(/\.js$/, '')))
            .then(utilities => {
                
                configOut = {
                    sqs: {
                        awsId: mqsConfig.userId,
                        region: mqsConfig.region,
                        queue: mqsConfig.queue
                    },
                    utilities: utilities
                };
                res.json(configOut);
            })
            .catch(err => res.send(err.toString()));
    });

    /* Get a message from SQS */
    router.get('/test', function (req, res) {
        var msgPlugin = require('../app/awsMessenger')(config);
        var task = require('../app/model/task');
        var utility = require('../app/utilFactory');
        var message;

        msgPlugin.requestTask()
            .then(message => {
                console.log("get successful");
                res.send(JSON.stringify(message));

                if (message == null) {
                    return null;
                }
                return utility.submitTask(task({
                    operation: "dnsLookup",
                    payload: message.payload,
                    respondTo: message.respondTo
                }));
            })
            .then(response => console.log(response))
            .catch(function (err) {
                console.log("get operation", err);
                res.send("get failure");
            });
    });

    return router;
}
