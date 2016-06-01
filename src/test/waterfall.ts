import Promise, { Resolvable } from '../index';

describe('Feature: waterfall', () => {
    it('Empty values array', () => {
        let callbackCalled = false;
        return Promise
            .waterfall([], 'x', () => {
                callbackCalled = true;
                return undefined;
            })
            .then(result => {
                result.should.equal('x');
                callbackCalled.should.be.false;
            });
    });

    it('All fulfilled without interruption', () => {
        let values = ['a', 'b', 'c', 'd'];

        return Promise
            .waterfall(values, 'x', callback)
            .then(result => {
                result.should.equal('d');
                return 'x';
            })
            .waterfall(values, callback)
            .should.eventually.equal('d');

        function callback(value: string, lastResult: string, index: number): Resolvable<string> {
            switch (index) {
                case 0:
                    lastResult.should.equal('x');
                    return value;
                case 1:
                    lastResult.should.equal('a');
                    return Promise.resolve(value);
                case 2:
                    lastResult.should.equal('b');
                    return new Promise<string>(resolve => {
                        setTimeout(() => {
                            resolve(value);
                        }, 20);
                    });
                case 3:
                    lastResult.should.equal('c');
                    return value;
                default:
                    return;
            }
        }
    });

    context('Break and fulfill lastResult', () => {
        it('Synchronously break', () => {
            return Promise
                .waterfall(['a', 'b', 'c', 'd'], 'x', (value, lastResult, index) => {
                    switch (index) {
                        case 0:
                            lastResult.should.equal('x');
                            return value;
                        case 1:
                            lastResult.should.equal('a');
                            return Promise.resolve(value);
                        case 2:
                            lastResult.should.equal('b');
                            Promise.break;
                        case 3:
                            lastResult.should.equal('c');
                            return value;
                        default:
                            return;
                    }
                })
                .should.eventually.equal('b');
        });

        it('Asynchronously break', () => {
            return Promise
                .waterfall(['a', 'b', 'c', 'd'], 'x', (value, lastResult, index) => {
                    switch (index) {
                        case 0:
                            lastResult.should.equal('x');
                            return value;
                        case 1:
                            lastResult.should.equal('a');
                            return Promise.resolve(value);
                        case 2:
                            lastResult.should.equal('b');
                            return Promise
                                .resolve(value)
                                .delay(20)
                                .break;
                        case 3:
                            lastResult.should.equal('c');
                            return value;
                        default:
                            return;
                    }
                })
                .should.eventually.equal('b');
        });
    });
});
