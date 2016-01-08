'use strict';

// Utilize Lo-Dash utility library
var _ = require('lodash');

// Extend the base configuration in all.js with environment
// specific configuration
module.exports = _.extend(
    require(__dirname + '/../config/env/all.js'),
    require(__dirname + '/../config/env/' + (process.env.NODE_ENV || 'dev') + '.js') || {}
);

// Don't allow application to start without an endpoint or a default topic
if (!module.exports.sqs_connection.endpoint ||
	!module.exports.sqs_connection.queue) {
	throw new Error("Application Variables Undefined: SQS Endpoint and default topic required.");
}
