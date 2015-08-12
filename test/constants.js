var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: constants', function () {
    var map = {
        true: true,
        false: false,
        void: undefined
    };
    
    context('Static constants', function () {
        Object
            .keys(map)
            .forEach(function (key) {
                var expectedValue = map[key];
                
                it('Promise.' + key + ' should eventually equal `' + expectedValue + '`', function () {
                    return Promise[key].then(function (value) {
                        Assert.strictEqual(value, expectedValue);
                    });
                });
            });
    });
    
    context('Property constants', function () {
        var promise = Promise.when(0);
        
        Object
            .keys(map)
            .forEach(function (key) {
                var expectedValue = map[key];
                
                it('promise.' + key + ' should eventually equal `' + expectedValue + '`', function () {
                    return promise[key].then(function (value) {
                        Assert.strictEqual(value, expectedValue);
                    });
                });
            });
    });
});