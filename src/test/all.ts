import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: all', () => {
    it('All fulfilled', () => {
        let promises = [
            new Promise<string>(resolve => {
                resolve('a');
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('b');
                }, 10);
            }),
            'c'
        ];

        return Promise
            .all(promises)
            .should.eventually.deep.equal(['a', 'b', 'c']);
    });

    it('One rejected', () => {
        let error = new Error();
        let count = 0;

        let promises = [
            new Promise<string>(resolve => {
                count++;
                resolve('a');
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    count++;
                    resolve('b');
                }, 10);
            }),
            Promise.reject<string>(error)
        ];

        return Promise
            .all(promises)
            .then(undefined, reason => {
                // Expecting to reject when the first one rejects.
                count.should.equal(1);
                reason.should.equal(error);
            });
    });

    it('Some rejected', () => {
        let error = new Error();
        let count = 0;

        let promises = [
            new Promise<string>(resolve => {
                count++;
                resolve('a');
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    count++;
                    resolve('b');
                }, 10);
            }),
            new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    count++;
                    reject({});
                }, 50);
            }),
            new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    count++;
                    reject(error);
                }, 10);
            })
        ];

        return Promise
            .all(promises)
            .then(undefined, reason => {
                count.should.equal(3);
                reason.should.equal(error);
            });
    });

    it('Empty promises array', () => {
        return Promise
            .all([])
            .then(values => {
                values.length.should.equal(0);
            });
    });
});
