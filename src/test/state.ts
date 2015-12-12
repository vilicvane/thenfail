import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: state', () => {
    context('Fulfilled promises', () => {
        testFulfilled(undefined, (promise, done) => {
            promise.then(() => {
                setTimeout(() => {
                    promise.fulfilled.should.be.true;
                    done();
                }, 0);
            });
        });
    });
    
    context('Rejected promises', () => {
        testRejected(new Error(), (promise, done) => {
            promise.then(undefined, () => {
                setTimeout(() => {
                    promise.rejected.should.be.true;
                    done();
                }, 0);
            });
        });
    });
    
    context('Interrupted promises', () => {
        it('Synchronously break', done => {
            let promiseA = Promise
                .void
                .then(() => {
                    Promise.break;
                });
            
            let promiseB = promiseA.then(() => {
                // never run
            });
            
            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.interrupted.should.be.true;
                done();
            }, 0);
        });
        
        it('Synchronously break in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise
                    .void
                    .then(() => {
                        Promise.break;
                    });
            });
            
            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });
        
        it('Synchronously break but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;
            
            promiseA = Promise.then(() => {
                promiseB = Promise
                    .then(() => {
                        Promise.break;
                    })
                    .then(() => { });
            });
            
            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.interrupted.should.be.true;
                done();
            }, 0);
        });
        
        it('Asynchronously break', done => {
            let promiseA = Promise.then(() => {
                return Promise.void.break;
            });
            
            let promiseB = promiseA.then(() => {
                // never run
            });
            
            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.interrupted.should.be.true;
                done();
            }, 0);
        });
        
        it('Asynchronously break in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise.then(() => {
                    return Promise.void.break;
                });
            });
            
            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });
        
        it('Asynchronously break but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;
            
            promiseA = Promise.then(() => {
                promiseB = Promise
                    .then(() => {
                        return Promise.void.break;
                    })
                    .then(() => { });
            });
            
            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.interrupted.should.be.true;
                done();
            }, 0);
        });
    });
});
