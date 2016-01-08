var cluster_support = function (exp) {
    var express = exp;

    this.startOne = function () {
        var cb = arguments[0] || function (address) {
                    console.log('Express server listening on port ' + address.address + ':' + address.port);
                };

        var server = express.listen(express.get('port'), function () {
            cb(server.address());
        });
    }
}

cluster_support.prototype.start = function () {
    var numCPUs = require('os').cpus().length;

    if (numCPUs < 2) {
        console.log('Number of CPUs ' + numCPUs);
        this.startOne();
    }
    else {
        var cluster = require('cluster');
        if (cluster.isMaster) {
            console.log('Number of CPUs ' + numCPUs);
            console.log('Launching in cluster mode');

            //for each core launch a worker
            for (var i = 0; i < numCPUs; i += 1) {
                cluster.fork();
            }

            // Listen for worker exit event
            cluster.on('exit', function (worker) {
                console.log('Worker ' + worker.id + ' exited. Launching again... ');
                cluster.fork();
            });

            cluster.on('listening', function (worker, address) {
                if(address.address == null) {
                    address.address = "localhost";
                }
                console.log('Worker ' + worker.id + ' is now connected to ' + address.address + ":" + address.port);
            });
        }
        else {
            this.startOne(function(address){});
        }
    }
}

module.exports = cluster_support;