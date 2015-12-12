require('source-map-support').install();

var Chai = require('chai');

Chai.should();
Chai.use(require('chai-as-promised'));

require('../bld/index').options.disableUnrelayedRejectionWarning = true;
