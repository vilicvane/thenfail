import Promise from '../index';

describe('Feature: reduce', () => {
    it('Promise.reduce Should return expected result', () => {
        return Promise
            .reduce([10, 20, 30], (prev, curr) => {
                return new Promise<number>(resolve => {
                    setTimeout(() => {
                        resolve(prev + curr)
                    }, 0);
                });
            }, 0)
            .should.eventually.equal(60);
    });

    it('promise.reduce Should return expected result', () => {
        return Promise
            .resolve(['abc', 'def', 'ghi'])
            .reduce((prev: HashTable<boolean>, curr: string) => {
                return new Promise<typeof prev>(resolve => {
                    setTimeout(() => {
                        prev[curr] = true;
                        resolve(prev);
                    }, 0);
                });
            }, {})
            .should.eventually.deep.equal({
                abc: true,
                def: true,
                ghi: true
            });
    });
});
