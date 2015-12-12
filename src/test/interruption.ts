import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: interruption', () => {
    context('Should invoke interruption handler if the current promise has run', () => {
        testFulfilled(undefined, (promise, done) => {
            let str = '';
            
            promise
                .break
                .interruption(() => {
                    str += 'a';
                });
            
            promise.then(() => {
                setTimeout(() => {
                    str.should.equal('a');
                    done();
                }, 10);
            });
        });
    });
    
    context('Should not invoke interruption handler if the current promise had never run', () => {
        testFulfilled(undefined, (promise, done) => {
            let str = '';
            
            promise
                .break
                .then(() => {
                    str += 'x';
                    // never run
                })
                .interruption(() => {
                    str += 'a';
                });
            
            promise.then(() => {
                setTimeout(() => {
                    str.should.equal('');
                    done();
                }, 10);
            });
        });
    });
    
    context('Should handle interruption handler exception', () => {
        testFulfilled(undefined, (promise, done) => {
            let error = new Error();
            
            promise
                .break
                .interruption(() => {
                    throw error;
                })
                .then(undefined, reason => {
                    if (error === reason) {
                        done();
                    } else {
                        done('Reason does not match');
                    }
                });
        });
    });
});
