var debug = require('debug')('routes-isactive');
var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  debug('responding for isactive')
  res.setHeader('cache-control', 'no-cache')
  res.status(200).send('ACTIVE')
});

module.exports = router;