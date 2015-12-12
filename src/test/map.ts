import Promise from '../index';

describe('Feature: map', () => {
    it('Promise.map Should return expected array', () => {
        return Promise
            .map([10, 20, 30], value => {
                return new Promise<number>(resolve => {
                    setTimeout(() => {
                        resolve(value / 10);
                    }, value);
                });
            })
            .should.eventually.deep.equal([1, 2, 3]);
    });
    
    it('promise.map Should return expected array', () => {
        return Promise
            .resolve([10, 20, 30])
            .map(value => {
                return new Promise<number>(resolve => {
                    setTimeout(() => {
                        resolve(value / 10);
                    }, value);
                });
            })
            .should.eventually.deep.equal([1, 2, 3]);
    });
});
