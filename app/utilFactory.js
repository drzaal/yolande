/**
 * Utility Factory
 * When Provided with a set of requests, initializes
 * the appropriate utility objects and processes all queues.
 * Upon completion, cleans up.
 */

module.exports = UtilFactory();

var utils = {};

function UtilFactory() {
	function submitTask (task) {
		if (!task.operation) {
			return null;
		} else if (!task.operation.match(/^\w+$/)) {
			return null;
		}

		if (utils[task.operation] === undefined || utils[task.operation] === null) {
			utils[task.operation] = require('./util/' + task.operation);
		}

        return utils[task.operation](task.payload); // Returns a task promise.
	}

	return {
		submitTask: submitTask		
	};
}

