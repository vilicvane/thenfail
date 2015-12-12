import Promise from '../index';

describe('Feature: spread', () => {
    it('Should spread', () => {
        return Promise
            .resolve(['abc', 123])
            .spread((str, num) => {
                str.should.equal('abc');
                num.should.equal(123);
                
                return 'biu';
            })
            .should.eventually.equal('biu');
    });
});
