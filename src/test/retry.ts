import Promise from '../index';

describe('Feature: retry', () => {
    it('Fulfilled directly', () => {
        return Promise
            .retry((reason, attemptIndex) => {
                return Promise.resolve('abc');
            })
            .should.eventually.equal('abc');
    });

    it('Rejected twice then succeed', () => {
        let count = 0;

        return Promise
            .retry((reason, attemptIndex) => {
                count++;

                switch (attemptIndex) {
                    case 0:
                        throw new Error();
                    case 1:
                        return Promise.reject<string>(new Error);
                    default:
                        return 'abc';
                }
            })
            .then(value => {
                count.should.equal(3);
                value.should.equal('abc');
            });
    });

    it('Exceeding retry limit', () => {
        let count = 0;

        return Promise
            .retry({ limit: 6 }, (reason, attemptIndex) => {
                count++;
                throw new Error('retry-error');
            })
            .then(() => {
                throw new Error('Should reject')
            }, reason => {
                count.should.equal(6);
                (reason as Error).message.should.equal('retry-error');
            });
    });
});
