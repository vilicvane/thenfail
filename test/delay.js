var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

describe('Feature: delay', function () {
    it('Promise.delay should delay', function () {
        var timestamp = Date.now();
        
        return Promise
            .delay(50)
            .then(function () {
                var elapsed = Date.now() - timestamp;
                Assert.equal(elapsed >= 40, true);
            });
    });
    
    it('promise.delay should delay with the same value', function () {
        var timestamp = Date.now();
        
        return Promise
            .true
            .delay(50)
            .then(function (value) {
                Assert.equal(value, true);
                
                var elapsed = Date.now() - timestamp;
                Assert.equal(elapsed >= 40, true);
            });
    });
});
