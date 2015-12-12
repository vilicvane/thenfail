import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

let testValue = {
    value: 'test value'
};

describe('Feature: handle', () => {
    context('Handle by fulfilled promises', () => {
        testFulfilled(testValue, (promise, done) => {
            let anotherPromise = new Promise<typeof testValue>();
            
            promise
                .handle(anotherPromise)
                .should.equal(promise);
            
            anotherPromise.then(value => {
                value.should.equal(testValue);
                done();
            });
        });
    });
    
    context('Handle by rejected promises', () => {
        testRejected(testValue, (promise, done) => {
            let anotherPromise = new Promise<typeof testValue>();
            
            promise
                .handle(anotherPromise)
                .should.equal(promise);
            
            anotherPromise.then(undefined, () => {
                done();
            });
        });
    });
    
    context('Handle callbacks by fulfilled promises', () => {
        testFulfilled(testValue, (promise, done) => {
            promise.handle((err, value) => {
                if (value == testValue) {
                    done();
                } else {
                    done('Unexpected value');
                }
            });
        });
    });
    
    context('Handle callbacks by rejected promises', () => {
        testRejected(testValue, (promise, done) => {
            promise.handle((err, value) => {
                if (err) {
                    done();
                } else {
                    done('Expecting error');
                }
            });
        });
    });
    
    context('Should report error on unsupported promise type', () => {
        (() => {
            let promise = new Promise<string>();
            promise.handle(<any>{});
        }).should.throw(TypeError);
    });
});
