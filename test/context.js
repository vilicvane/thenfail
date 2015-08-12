var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;
var Context = ThenFail.Context;

describe('Feature: promise context', function () {
    it('Should not be interrupted if context persists', function () {
        var context = new Context();
        
        var count = 0;
        
        return Promise
            .context(context)
            .then(function () {
                count++;
            })
            .then(function () {
                count++;
            })
            .then(function () {
                Assert.equal(count, 2);
            });
    });
    
    it('Should be interrupted if context disposed', function (done) {
        var context = new Context();
        
        var str = '';
        
        var promise = Promise
            .context(context)
            .then(function () {
                str += 'a';
                
                return new Promise(function (resolve) {
                    setTimeout(resolve, 20);
                });
            })
            .then(function () {
                str += 'b';
            });
        
        setTimeout(function () {
            context.dispose();
        }, 10);
        
        setTimeout(function () {
            Assert(promise.interrupted);
            Assert.equal(str, 'a');
            done();
        }, 30);
    });
    
    it('Should not be interrupted if nested context disposed', function (done) {
        var context = new Context();
        
        var str = '';
        
        Promise
            .then(function () {
                return Promise
                    .context(context)
                    .then(function () {
                        str += 'a';
                        
                        return new Promise(function (resolve) {
                            setTimeout(resolve, 20);
                        });
                    });
            })
            .then(function () {
                str += 'b';
            });
            
        setTimeout(function () {
            context.dispose();
        }, 10);
        
        setTimeout(function () {
            Assert.equal(str, 'ab');
            done();
        }, 30);
    });
    
    it('Should interrupt nested context', function (done) {
        var str = '';
        
        var promise = Promise
            .then(function () {
                return Promise
                    .then(function () {
                        str += 'a';
                        
                        return new Promise(function (resolve) {
                            setTimeout(resolve, 20);
                        });
                    })
                    .then(function () {
                        str += 'b';
                    });
            })
            .then(function () {
                str += 'c';
            });
            
        setTimeout(function () {
            promise.context.dispose();
        }, 10);
        
        setTimeout(function () {
            Assert(promise.interrupted);
            Assert.equal(str, 'a');
            done();
        }, 30);
    });
});