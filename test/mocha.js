require('source-map-support').install();

var Chai = require('chai');

Chai.should();
Chai.use(require('chai-as-promised'));

var options = require('../bld/index').options;

options.logger = {
    log: function () { },
    warn: function () { },
    error: function () { }
};
