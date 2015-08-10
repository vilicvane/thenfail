var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: state', function () {
    context('Fulfilled promises', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            promise.then(function () {
                setTimeout(function () {
                    assert(promise.fulfilled);
                    done();
                }, 0);
            });
        });
    });
    
    context('Rejected promises', function () {
        ThreeCases.testRejected(undefined, function (promise, done) {
            promise.then(undefined, function () {
                setTimeout(function () {
                    assert(promise.rejected);
                    done();
                }, 0);
            });
        });
    });
    
    context('Interrupted promises', function () {
        it('immediately break', function (done) {
            var promiseA = Promise
                .void
                .break;
            
            var promiseB = promiseA.then(function () {
                // never run
            });
            
            setTimeout(function () {
                assert(promiseA.fulfilled);
                assert(promiseB.interrupted);
                done();
            }, 0);
        });
        
        it('immediately break from nested promise', function (done) {
            var promise = Promise
                .then(function () {
                    return Promise
                        .void
                        .break
                        .then(function () { });
                })
                .then(function () { });
            
            setTimeout(function () {
                assert(promise.fulfilled);
                done();
            }, 0);
        });
    });
});