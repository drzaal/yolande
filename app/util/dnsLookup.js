var Promise = require('bluebird');
var dns = require('dns');

dns.lookup = Promise.promisify(dns.lookup); // Promisify DNS lookups
dns.reverse = Promise.promisify(dns.reverse);

/**
 * Machine request gets machine data from a list of machines.
 * Routine takes a list of machine names ( DNS lookup entries) and retrieves
 * as much data as can be pulled.
 */

module.exports = queryMachineList;

/**
 * Processes a list of Machine names for Lookup
 * Returns a Promise for completion of Machine lookup
 * @param mixed machine A string machine name, or an array of string machine names.
 */
function queryMachineList(machine) {
    var machine_collection;
    try {
        if (typeof machine === "string" || machine instanceof String) {
            machine_collection = [machine];
        } else {
            machine_collection = machine;
        }
    } catch (err) { // Invalid JSON response;
        callback(err);
    }

    var i = 0,
        imax = machine_collection.length;
    var machines_data = {},
        outstanding_req_count = imax;

    var resolution_progress = [];
    for (i = 0; i < imax; i++) {
        machine = machine_collection[i];
        resolution_progress.push(lookupByDNS({
            name: machine
        }));
    }

    var resultsAsync = Promise.all(resolution_progress)
        .then(machine_collection =>
            machine_collection.filter(a => a !== null)
        )
        .catch(function () {
            return [];
        });
    return resultsAsync;
}

/**
 * Given a machine name, requests machine data from the network
 * @param Object machine Machine object, requires at LEAST a name.
 * @return Promise Machine Lookup promise.
 *     Machine data and resolution status.
 */
function lookupByDNS(machine) {
    return dns.lookup(machine.name)
        .timeout(7500)
        .then(function (addresses) {
            if (addresses !== null) {
                if (typeof addresses === 'string' || addresses instanceof String) {} else if (addresses.length > 0) {
                    addresses = addresses[0];
                }
            } else {
                throw new Error("Bad DNS lookup response");
            }
            machine.ipAddress = addresses;

            machine = parseMachineName(machine);
            if (machine.domain !== undefined && machine.domain.length > 0) {
								machine.status = "resolved";
                return Promise.resolve(machine);
            } else { // If not provided with FDQN, try retreive Domain.
                return dns.reverse(addresses)
                    .then(function (hostnames) {
                        if (typeof hostnames === 'string' || hostnames instanceof String) {} else if (hostnames.length > 0) {
                            hostnames = hostnames[0];
                        } else {
                            throw new Error("Empty Hostnames Response");
                        }
                        machine.name = hostnames;
                        machine = parseMachineName(machine);
												machine.status = "resolved";
                        return machine;
                    }); // Better to force FDQN on reverse failure.
            }
        })
        .catch(function (err) {
            console.log(err);
            return { name: machine.name, status: "unresolved" };
        });
}

/**
 * Parse Machine Name
 * @param Object machine An incomplete machine model which contains a name.
 */
function parseMachineName(machine) {
    var hostname = machine.name.split(".")[0];

    if (machine.name.length != hostname.length) {
        machine.domain = machine.name.slice(hostname.length + 1);
    }
    machine.name = hostname;

    return machine;
}

// Expose private methods in test mode.
if (process.env.NODE_ENV == 'test') {
    exports.__private = {
        lookupByDNS: lookupByDNS,
        parseMachineName: parseMachineName
    };
}
