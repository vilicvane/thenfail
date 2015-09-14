var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: state', function () {
    context('Fulfilled promises', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            promise.then(function () {
                setTimeout(function () {
                    Assert(promise.fulfilled);
                    done();
                }, 0);
            });
        });
    });
    
    context('Rejected promises', function () {
        ThreeCases.testRejected(new Error(), function (promise, done) {
            promise.then(undefined, function () {
                setTimeout(function () {
                    Assert(promise.rejected);
                    done();
                }, 0);
            });
        });
    });
    
    context('Interrupted promises', function () {
        it('Synchronously break', function (done) {
            var promiseA = Promise
                .void
                .then(function () {
                    Promise.break;
                });
            
            var promiseB = promiseA.then(function () {
                // never run
            });
            
            setTimeout(function () {
                Assert(promiseA.fulfilled);
                Assert(promiseB.interrupted);
                done();
            }, 0);
        });
        
        it('Synchronously break in the last nested chain', function (done) {
            var promise = Promise.then(function () {
                return Promise
                    .void
                    .then(function () {
                        Promise.break;
                    });
            });
            
            setTimeout(function () {
                Assert(promise.fulfilled);
                done();
            }, 0);
        });
        
        it('Synchronously break but not in the last nested chain', function (done) {
            var promiseA;
            var promiseB;
            
            promiseA = Promise.then(function () {
                promiseB = Promise
                    .then(function () {
                        Promise.break;
                    })
                    .then(function () { });
            });
            
            setTimeout(function () {
                Assert(promiseA.fulfilled);
                Assert(promiseB.interrupted);
                done();
            }, 0);
        });
        
        it('Asynchronously break', function (done) {
            var promiseA = Promise.then(function () {
                return Promise.void.break;
            });
            
            var promiseB = promiseA.then(function () {
                // never run
            });
            
            setTimeout(function () {
                Assert(promiseA.fulfilled);
                Assert(promiseB.interrupted);
                done();
            }, 0);
        });
        
        it('Asynchronously break in the last nested chain', function (done) {
            var promise = Promise.then(function () {
                return Promise.then(function () {
                    return Promise.void.break;
                });
            });
            
            setTimeout(function () {
                Assert(promise.fulfilled);
                done();
            }, 0);
        });
        
        it('Asynchronously break but not in the last nested chain', function (done) {
            var promiseA;
            var promiseB;
            
            promiseA = Promise.then(function () {
                promiseB = Promise
                    .then(function () {
                        return Promise.void.break;
                    })
                    .then(function () { });
            });
            
            setTimeout(function () {
                Assert(promiseA.fulfilled);
                Assert(promiseB.interrupted);
                done();
            }, 0);
        });
    });
});