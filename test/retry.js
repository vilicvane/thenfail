var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: retry', function () {
    it('Fulfilled directly', function () {
        return Promise
            .retry(function (reason, attemptIndex) {
                return Promise.resolve('abc');
            })
            .then(function (value) {
                Assert.equal(value, 'abc');
            });
    });
    
    it('Rejected twice then succeed', function () {
        var count = 0;
        
        return Promise
            .retry(function (reason, attemptIndex) {
                count++;
                
                switch (attemptIndex) {
                    case 0:
                        throw new Error();
                    case 1:
                        return Promise.reject(new Error);
                    default:
                        return 'abc';
                }
            })
            .then(function (value) {
                Assert.equal(count, 3);
                Assert.equal(value, 'abc');
            });
    });
    
    it('Exceeding retry limit', function () {
        var count = 0;
        
        return Promise
            .retry({ limit: 6 }, function (reason, attemptIndex) {
                count++;
                throw new Error('retry-error');
            })
            .then(function () {
                throw new Error('Should reject')
            }, function (reason) {
                Assert.equal(count, 6);
                Assert.equal(reason.message, 'retry-error');
            });
    });
});