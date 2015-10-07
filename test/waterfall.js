var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

describe('Feature: waterfall', function () {
    it('Empty values array', function () {
        var callbackCalled = false;
        return Promise
            .waterfall([], 'x', function () {
                callbackCalled = true;
            })
            .then(function (result) {
                Assert.equal(result, 'x');
                Assert.equal(callbackCalled, false);
            });
    });
    
    it('All fulfilled without interruption', function () {
        var values = ['a', 'b', 'c', 'd'];
        
        return Promise
            .waterfall(values, 'x', callback)
            .then(function (result) {
                Assert.equal(result, 'd');
                return 'x';
            })
            .waterfall(values, callback)
            .then(function (result) {
                Assert.equal(result, 'd');
            });
        
        function callback(value, lastResult, index) {
            switch (index) {
                case 0:
                    Assert.equal(lastResult, 'x');
                    return value;
                case 1:
                    Assert.equal(lastResult, 'a');
                    return Promise.resolve(value);
                case 2:
                    Assert.equal(lastResult, 'b');
                    return new Promise(function (resolve) {
                        setTimeout(function () {
                            resolve(value);
                        }, 20);
                    });
                case 3:
                    Assert.equal(lastResult, 'c');
                    return value;
            }
        }
    });
    
    context('Break and fulfill lastResult', function () {
        it('Synchronously break', function () {
            return Promise
                .waterfall(['a', 'b', 'c', 'd'], 'x', function (value, lastResult, index) {
                    switch (index) {
                        case 0:
                            Assert.equal(lastResult, 'x');
                            return value;
                        case 1:
                            Assert.equal(lastResult, 'a');
                            return Promise.resolve(value);
                        case 2:
                            Assert.equal(lastResult, 'b');
                            Promise.break;
                        case 3:
                            Assert.equal(lastResult, 'c');
                            return value;
                    }
                })
                .then(function (result) {
                    Assert.equal(result, 'b');
                });
        });
        
        it('Asynchronously break', function () {
            return Promise
                .waterfall(['a', 'b', 'c', 'd'], 'x', function (value, lastResult, index) {
                    switch (index) {
                        case 0:
                            Assert.equal(lastResult, 'x');
                            return value;
                        case 1:
                            Assert.equal(lastResult, 'a');
                            return Promise.resolve(value);
                        case 2:
                            Assert.equal(lastResult, 'b');
                            return Promise
                                .resolve(value)
                                .delay(20)
                                .break;
                        case 3:
                            Assert.equal(lastResult, 'c');
                            return value;
                    }
                })
                .then(function (result) {
                    Assert.equal(result, 'b');
                });
        });
    });
    
});