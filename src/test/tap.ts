import Promise from '../index';

describe('Feature: tap', () => {
    it('Should relay the value', () => {
        return Promise
            .true
            .tap(value => {
                value.should.be.true;
            })
            .tap(value => {
                value.should.be.true;

                return new Promise<void>(resolve => {
                    setTimeout(resolve, 10);
                });
            })
            .should.eventually.be.true;
    });

    it('Should be in the chain', () => {
        return Promise
            .true
            .tap(value => {
                return new Promise<void>((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error());
                    }, 10);
                });
            })
            .tap(value => {
                return Promise.delay(10);
            })
            .then(value => { })
            .should.be.rejected;
    });
});
