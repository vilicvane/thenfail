import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: fail and catch', () => {
    context('promise.fail should not be triggerred when no error', () => {
        testFulfilled(undefined, (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .fail(() => {
                    str += 'b';
                });
                
            setTimeout(() => {
                str.should.equal('a');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should not be triggerred when no error', () => {
        testFulfilled(undefined, (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .catch(() => {
                    str += 'b';
                });
                
            setTimeout(() => {
                str.should.equal('a');
                done();
            }, 20);
        });
    });
    
    context('promise.fail should be triggerred when error', () => {
        let error = new Error();
        
        testRejected(error, (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .fail(reason => {
                    if (reason !== error) {
                        done('fail reason should be the rejection error');
                        return;
                    }
                    
                    str += 'b';
                });
                
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should be triggerred when error', () => {
        testRejected(new Error(), (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .catch(reason => {
                    str += 'b';
                });
                
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should catch matched error', () => {
        let typeError = new TypeError();
        
        testRejected(typeError, (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .catch(TypeError, reason => {
                    if (reason !== typeError) {
                        done('Unexpected error type');
                    }
                    
                    str += 'b';
                })
                .then(undefined, () => {
                    str += 'c';
                });
                
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 20);
        });
    });
    
    context('promise.catch should skip unmatched error', () => {
        testRejected(new Error(), (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .catch(TypeError, () => {
                    str += 'b';
                })
                .then(undefined, () => {
                    str += 'c';
                });
                
            setTimeout(() => {
                str.should.equal('c');
                done();
            }, 20);
        });
    });
    
    context('Multiple promise.catch should work', () => {
        testRejected(new Error(), (promise, done) => {
            let str = '';
            
            promise
                .then(() => {
                    str += 'a';
                })
                .catch(TypeError, () => {
                    str += 'b';
                })
                .catch(Error, () => {
                    str += 'c';
                })
                .then(undefined, () => {
                    str += 'd';
                });
                
            setTimeout(() => {
                str.should.equal('c');
                done();
            }, 20);
        });
    });
});
