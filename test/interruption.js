var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: interruption', function () {
    context('Should invoke interruption handler if the current promise has run', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            var str = '';
            
            promise
                .break
                .interruption(function () {
                    str += 'a';
                });
            
            promise.then(function () {
                setTimeout(function () {
                    assert.equal(str, 'a');
                    done();
                }, 10);
            });
        });
    });
    
    context('Should not invoke interruption handler if the current promise had never run', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            var str = '';
            
            promise
                .break
                .then(function () {
                    str += 'x';
                    // never run
                })
                .interruption(function () {
                    str += 'a';
                });
            
            promise.then(function () {
                setTimeout(function () {
                    assert.equal(str, '');
                    done();
                }, 10);
            });
        });
    });
    
    context('Should handle interruption handler exception', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            var error = new Error();
            
            promise
                .break
                .interruption(function () {
                    throw error;
                })
                .then(undefined, function (reason) {
                    if (error === reason) {
                        done();
                    } else {
                        done('Reason does not match');
                    }
                });
        });
    });
});