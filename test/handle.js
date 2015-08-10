var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;
var Context = ThenFail.Context;

var ThreeCases = require('./helpers/three-cases');

var testValue = {
    value: 'test value'
};

describe('Feature: handle', function () {
    context('Handle by fulfilled promises', function () {
        ThreeCases.testFulfilled(testValue, function (promise, done) {
            var anotherPromise = new Promise();
            assert.equal(promise.handle(anotherPromise), promise);
            anotherPromise.then(function (value) {
                assert.equal(value, testValue);
                done();
            });
        });
    });
    
    context('Handle by rejected promises', function () {
        ThreeCases.testRejected(testValue, function (promise, done) {
            var anotherPromise = new Promise();
            assert.equal(promise.handle(anotherPromise), promise);
            anotherPromise.then(undefined, function () {
                done();
            });
        });
    });
    
    context('Handle callbacks by fulfilled promises', function () {
        ThreeCases.testFulfilled(testValue, function (promise, done) {
            promise.handle(function (err, value) {
                if (value == testValue) {
                    done();
                } else {
                    done('Unexpected value');
                }
            })
        });
    });
    
    context('Handle callbacks by rejected promises', function () {
        ThreeCases.testRejected(testValue, function (promise, done) {
            promise.handle(function (err, value) {
                if (err) {
                    done();
                } else {
                    done('Expecting error');
                }
            })
        });
    });
});