var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

describe('Feature: spread', function () {
    it('Should spread', function () {
        return Promise
            .resolve(['abc', 123])
            .spread(function (str, num) {
                Assert.equal(str, 'abc');
                Assert.equal(num, '123');
                
                return 'biu';
            })
            .then(function (value) {
                Assert.equal(value, 'biu');
            });
    });
});