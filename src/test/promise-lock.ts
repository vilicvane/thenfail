import Promise, { PromiseLock } from '../index';

describe('Feature: Promise Lock', () => {
    it('Should lock', done => {
        let lock = new PromiseLock();
        let str = '';

        lock.lock(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';
                });
        });

        lock.lock(() => {
            if (str !== 'a') {
                done('Unexpected result');
            }

            str += 'b';
        });

        lock.lock(() => {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });

    it('Should unlock on rejection', done => {
        let lock = new PromiseLock();
        let str = '';

        lock.lock(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';

                    throw {};
                });
        });

        lock.lock(() => {
            if (str !== 'a') {
                done('Unexpected result');
            }

            str += 'b';

            throw new Error();
        });

        lock.lock(() => {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });
});
