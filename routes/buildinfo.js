var debug = require('debug')('routes-buildinfo');
var path = require('path');
var express = require('express');

var version = {};
try {
  version = require(path.join(__dirname, '../config/version')) || { version: 'unknown' }
} catch (ex) {
}

var router = express.Router();

router.get('/', function(req, res) {
  debug('responding for isactive');
  res.setHeader('cache-control', 'no-cache; max-age=0');
  res.setHeader('content-type', 'application/json');

  //res.status(200).sendFile(path.join(__dirname, '../config/version.json'))
  res.status(200).send(version)
});

module.exports = router;