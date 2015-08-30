var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;
var invoke = ThenFail.invoke;

var ThreeCases = require('./helpers/three-cases');

var testValue = {
    value: 'test value'
};

describe('Feature: invoke', function () {
    context('Successful invocation', function () {
        it('Invoke successfully asynchronously', function () {
            return invoke(function (a, b, callback) {
                Assert.equal(a, 123);
                Assert.equal(b, 'abc');
                
                setTimeout(function () {
                    callback(undefined, testValue);
                }, 10);
            }, 123, 'abc')
                .then(function (value) {
                    Assert.equal(value, testValue);
                }, function (reason) {
                    throw reason;
                });
        });
        
        it('Invoke successfully synchronously', function () {
            return invoke(function (a, b, callback) {
                Assert.equal(a, 123);
                Assert.equal(b, 'abc');
                
                callback(undefined, testValue);
            }, 123, 'abc')
                .then(function (value) {
                    Assert.equal(value, testValue);
                }, function (reason) {
                    throw reason;
                });
        });
    });
    
    context('Failed invocation', function () {
        it('Invoke failed asynchronously', function () {
            return invoke(function (a, b, callback) {
                Assert.equal(a, 123);
                Assert.equal(b, 'abc');
                
                setTimeout(function () {
                    callback(new Error('invoke-failure'));
                }, 10);
            }, 123, 'abc')
                .then(function () {
                    throw new Error('Expecting error');
                }, function (reason) {
                    Assert.equal(reason.message, 'invoke-failure');
                });
        });
        
        it('Invoke successfully synchronously', function () {
            return invoke(function (a, b, callback) {
                Assert.equal(a, 123);
                Assert.equal(b, 'abc');
                
                callback(new Error('invoke-failure'));
            }, 123, 'abc')
                .then(function () {
                    throw new Error('Expecting error');
                }, function (reason) {
                    Assert.equal(reason.message, 'invoke-failure');
                });
        });
    });
});