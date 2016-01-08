var standAlone = false;
process.argv.forEach(function (val, index) {
    standAlone = (val === '--standalone');
});

var server = require('./app');

if (standAlone) {
    server.startOne();
}
else {
    server.start();
}
var utilitron = require('./app/poller');
utilitron.startPolling();

