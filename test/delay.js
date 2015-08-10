var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;

describe('Feature: delay', function () {
    it('Promise.delay should delay', function () {
        var timestamp = Date.now();
        
        return Promise
            .delay(50)
            .then(function () {
                var elapsed = Date.now() - timestamp;
                assert(elapsed >= 40);
            });
    });
    
    it('promise.delay should delay with the same value', function () {
        var timestamp = Date.now();
        
        return Promise
            .true
            .delay(50)
            .then(function (value) {
                assert(value === true);
                
                var elapsed = Date.now() - timestamp;
                assert(elapsed >= 40);
            });
    });
});
