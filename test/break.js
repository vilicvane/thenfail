var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;
var Context = ThenFail.Context;

describe('Feature: break promises chain', function () {
    it('Fake statement Promise.break should break the chain', function (done) {
        Promise
            .then(function () {
                Promise.break;
            })
            .then(function () {
                done('Did not break');
            })
            .then(function () {
                done('Did not break');
            });
            
        setTimeout(done, 10);
    });
    
    it('Return promise.break should break the chain', function (done) {
        Promise
            .then(function () {
                return Promise
                    .then(function () { })
                    .break;
            })
            .then(function () {
                done('Did not break');
            });
        
        setTimeout(done, 10);
    });
    
    it('Interrupted chain should not continue', function (done) {
        var promise = Promise
            .then(function () {
                Promise.break;
            })
            .then(function () {
                done('Did not break');
            });
        
        setTimeout(function () {
            promise.then(function () {
                done('Did not break');
            });
            
            setTimeout(done, 10);
        }, 10);
    });
    
    it('Should only break enclosed part', function (done) {
        Promise
            .resolve('abc')
            .then(function () {
                Promise.break;
            })
            .then(function () {
                done('Did not break');
            })
            .enclose()
            .then(function (str) {
                if (str !== undefined) {
                    done('str should be undefined');
                } else {
                    done();
                }
            });
    });
    
    it('Should break enclosed part with onrejected handler', function (done) {
        Promise
            .resolve('abc')
            .then(function () {
                Promise.break;
            })
            .then(function () {
                done('Did not break');
            }, function () {
                done('Did not break');
            })
            .enclose()
            .then(function (str) {
                if (str !== undefined) {
                    done('str should be undefined');
                } else {
                    done();
                }
            });
    });
    
    context('Should only break current chain', function () {
        it('Break in the last nested then', function (done) {
            var str = '';
            
            Promise
                .then(function () {
                    return Promise
                        .void
                        .then(function () {
                            Promise.break;
                        });
                })
                .then(function () {
                    str += 'b';
                });
            
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 10);
        });
        
        it('Break but not in the last nested then', function (done) {
            var str = '';
            
            Promise
                .then(function () {
                    return Promise
                        .then(function () {
                            Promise.break;
                        })
                        .then(function () {
                            str += 'a';
                        });
                })
                .then(function () {
                    str += 'b';
                });
            
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 10);
        });
        
        it('Asynchronously break in the last nested then', function (done) {
            var str = '';
            
            Promise
                .then(function () {
                    return Promise
                        .void
                        .then(function () {
                            return Promise.void.break;
                        });
                })
                .then(function () {
                    str += 'b';
                });
            
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 10);
        });
        
        it('Asynchronously break but not in the last nested then', function (done) {
            var str = '';
            
            Promise
                .then(function () {
                    return Promise
                        .then(function () {
                            return Promise.void.break;
                        })
                        .then(function () {
                            str += 'a';
                        });
                })
                .then(function () {
                    str += 'b';
                });
            
            setTimeout(function () {
                Assert.equal(str, 'b');
                done();
            }, 10);
        });
    });
    
});
