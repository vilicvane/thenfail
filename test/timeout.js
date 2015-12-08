var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

describe('Feature: timeout', function () {
    it('Should timeout', function (done) {
        Promise
            .then(function () {
                return new Promise();
            })
            .timeout(10)
            .then(undefined, function (reason) {
                if (reason && reason.name === 'TimeoutError') {
                    done();
                } else {
                    done('Unexpected error');
                }
            });
    });
    
    it('Should timeout and cancel chained promises', function (done) {
        var str = '';
        
        Promise
            .then(function () {
                str += 'a';
                return new Promise(function (resolve) {
                    setTimeout(resolve, 10);
                });
            })
            .then(function () {
                str += 'b';
                return new Promise(function (resolve) {
                    setTimeout(resolve, 50);
                });
            })
            .then(function () {
                str += 'c';
            })
            .timeout(30)
            .then(undefined, function (reason) {
                if (reason && reason.name === 'TimeoutError' && reason.toString() === 'TimeoutError') {
                    setTimeout(function () {
                        if (str === 'ab') {
                            done();
                        } else {
                            done('Should not run chained promise after timed out');
                        }
                    }, 50);
                } else {
                    done('Unexpected error');
                }
            });
    });
    
    it('Should timeout and dispose nested context', function (done) {
        var str = '';
        
        Promise
            .then(function () {
                str += 'a';
                return new Promise(function (resolve) {
                    setTimeout(resolve, 10);
                });
            })
            .then(function () {
                str += 'b';
                return new Promise(function (resolve) {
                    setTimeout(resolve, 50);
                })
                    .then(function () {
                        str += 'c';
                    });
            })
            .then(function () {
                str += 'd';
            })
            .timeout(30)
            .then(undefined, function (reason) {
                if (reason && reason.name === 'TimeoutError') {
                    setTimeout(function () {
                        if (str === 'ab') {
                            done();
                        } else {
                            done('Should not run chained promise after timed out');
                        }
                    }, 50);
                } else {
                    done('Unexpected error');
                }
            });
    });
});
