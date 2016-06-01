import Promise from '../index';

describe('Feature: delay', () => {
    it('Promise.delay should delay', () => {
        let timestamp = Date.now();

        return Promise
            .delay(50)
            .then(() => {
                let elapsed = Date.now() - timestamp;
                elapsed.should.be.greaterThan(40);
            });
    });

    it('promise.delay should delay with the same value', () => {
        let timestamp = Date.now();

        return Promise
            .true
            .delay(50)
            .then(value => {
                value.should.be.true;

                let elapsed = Date.now() - timestamp;
                elapsed.should.be.greaterThan(40);
            });
    });
});
