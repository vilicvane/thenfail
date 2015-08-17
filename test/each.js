var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: each', function () {
    it('All fulfilled without interruption', function () {
        var str = '';
        
        setTimeout(function () {
            Assert.equal(str, 'abc');
        }, 20);
        
        return Promise
            .each(['a', 'b', 'c', 'd'], function (char) {
                str += char;
                
                switch (char) {
                    case 'a':
                        break;
                    case 'b':
                        return 'false';
                    case 'c':
                        new Promise(function (resolve) {
                            setTimeout(resolve, 50);
                        });
                    case 'd':
                        return true;
                }
            })
            .then(function (completed) {
                Assert.equal(completed, true);
                Assert.equal(str, 'abcd');
            });
    });
    
    it('Promise.break can break', function () {
        var str = '';
        
        return Promise
            .each(['a', 'b', 'c'], function (char) {
                str += char;
                
                switch (char) {
                    case 'a':
                        break;
                    case 'b':
                        Promise.break;
                    case 'c':
                        return true;
                }
            })
            .then(function (completed) {
                Assert.equal(completed, false);
                Assert.equal(str, 'ab');
            });
    });
    
    it('All would be fulfilled but interrupted by a returned `false`', function () {
        var str = '';
        
        return Promise
            .each(['a', 'b', 'c', 'd', 'e'], function (char) {
                str += char;
                
                if (char === 'd') {
                    return false;
                }
            })
            .then(function (completed) {
                Assert.equal(completed, false);
                Assert.equal(str, 'abcd');
            });
    });
    
    it('Interrupted by rejection', function (done) {
        var error = new Error();
        var str = '';
        
        return Promise
            .each(['a', 'b', 'c', 'd', 'e'], function (char) {
                str += char;
                
                if (char === 'd') {
                    throw error;
                }
            })
            .then(undefined, function (reason) {
                try {
                    Assert.equal(reason, error);
                    Assert.equal(str, 'abcd');
                    done();
                } catch (e) {
                    done(e);
                }
            });
    });
    
    it('Empty array', function () {
        return Promise
            .each([], function () { })
            .then(function (completed) {
                Assert.equal(completed, true);
            });
    });
});