var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: fail and catch', function () {
    context('promise.fail should not be triggerred when no error', function () {
        ThreeCases.testFulfilled(undefined, function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .fail(function () {
                    str += 'b';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'a');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should not be triggerred when no error', function () {
        ThreeCases.testFulfilled(undefined, function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .catch(function () {
                    str += 'b';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'a');
                done();
            }, 20);
        });
    });
    
    context('promise.fail should be triggerred when error', function () {
        var error = new Error();
        
        ThreeCases.testRejected(error, function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .fail(function (reason) {
                    if (reason !== error) {
                        done('fail reason should be the rejection error');
                        return;
                    }
                    
                    str += 'b';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should be triggerred when error', function () {
        ThreeCases.testRejected(new Error(), function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .catch(function (reason) {
                    str += 'b';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should catch matched error', function () {
        var typeError = new TypeError();
        
        ThreeCases.testRejected(typeError, function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .catch(TypeError, function (reason) {
                    if (reason !== typeError) {
                        done('Unexpected error type');
                    }
                    
                    str += 'b';
                })
                .then(undefined, function () {
                    str += 'c';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should skip unmatched error', function () {
        ThreeCases.testRejected(new Error(), function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .catch(TypeError, function () {
                    str += 'b';
                })
                .then(undefined, function () {
                    str += 'c';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'c');
                done();
            }, 20);
        });
    });
    
    context('Multiple promise.catch should work', function () {
        ThreeCases.testRejected(new Error(), function(promise, done) {
            var str = '';
            
            promise
                .then(function () {
                    str += 'a';
                })
                .catch(TypeError, function () {
                    str += 'b';
                })
                .catch(Error, function () {
                    str += 'c';
                })
                .then(undefined, function () {
                    str += 'd';
                });
                
            setTimeout(function () {
                Assert.equal(str, 'c');
                done();
            }, 20);
        });
    });
});
