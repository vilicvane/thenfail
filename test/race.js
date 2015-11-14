var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: race', function () {
    it('First resolved promise should relay its state', function () {
        var promises = [
            new Promise(function (resolve) {
                resolve('a');
            }),
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .then(function (value) {
                Assert.deepEqual(value, 'a');
            });
    });
    
    it('First resolved promise at second place should relay its state', function () {
        var promises = [
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('a');
                }, 20);
            }),
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .then(function (value) {
                Assert.deepEqual(value, 'b');
            });
    });
    
    it('First resolved promise should relay its state even rejection happens later', function () {
        var promises = [
            new Promise(function (resolve, reject) {
                setTimeout(function () {
                    reject(new Error());
                }, 20);
            }),
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .then(function (value) {
                Assert.deepEqual(value, 'b');
            });
    });
    
    it('First rejected promise should relay its state', function () {
        var error = new Error();
        
        var promises = [
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('a');
                }, 10);
            }),
            Promise.reject(error)
        ];
        
        return Promise
            .race(promises)
            .then(undefined, function (reason) {
                Assert.equal(reason, error);
            });
    });
    
    it('First rejected promise should relay its state even if there are multiple rejections', function () {
        var error = new Error();
        
        var promises = [
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('a');
                }, 10);
            }),
            new Promise(function (resolve) {
                setTimeout(function () {
                    resolve('b');
                }, 10);
            }),
            new Promise(function (resolve, reject) {
                setTimeout(function () {
                    reject({});
                }, 10);
            }),
            Promise.reject(error)
        ];
        
        return Promise
            .race(promises)
            .then(undefined, function (reason) {
                Assert.equal(reason, error);
            });
    });
    
    it('Race empty promises will create a forever-pending promise', function (done) {
        var promise = Promise.race([]);
        
        setTimeout(function () {
            Assert.equal(promise.pending, true);
            done();
        }, 10);
    });
});
