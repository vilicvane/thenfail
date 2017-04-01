import Promise from '../index';

describe('Feature: each', () => {
    it('All fulfilled without interruption', () => {
        let str = '';

        let startAt = Date.now();

        return Promise
            .each(['a', 'b', 'c', 'd'], char => {
                str += char;

                switch (char) {
                    case 'a':
                        break;
                    case 'b':
                        return <any>'false';
                    case 'c':
                        return new Promise<string>(resolve => {
                            setTimeout(resolve, 50);
                        });
                    case 'd':
                        return true;
                }
            })
            .then(completed => {
                let elapsed = Date.now() - startAt;
                elapsed.should.be.greaterThan(40);
                completed.should.be.true;
                str.should.equal('abcd');
            });
    });

    it('Promise.break can break', () => {
        let str = '';

        return Promise
            .each(['a', 'b', 'c'], char => {
                str += char;

                switch (char) {
                    case 'a':
                        return undefined;
                    case 'b':
                        Promise.break;
                        return undefined;
                    case 'c':
                        return true;
                    default:
                        return undefined;
                }
            })
            .then(completed => {
                completed.should.be.false;
                str.should.equal('ab');
            });
    });

    it('All would be fulfilled but interrupted by a returned `false`', () => {
        let str = '';

        return Promise
            .each(['a', 'b', 'c', 'd', 'e'], char => {
                str += char;

                if (char === 'd') {
                    return false;
                } else {
                    return undefined;
                }
            })
            .then(completed => {
                completed.should.be.false;
                str.should.equal('abcd');
            });
    });

    it('Interrupted by rejection', () => {
        let error = new Error();
        let str = '';

        return Promise
            .each(['a', 'b', 'c', 'd', 'e'], char => {
                str += char;

                if (char === 'd') {
                    throw error;
                }
            })
            .then(undefined, (reason: Error) => {
                reason.should.equal(error);
                str.should.equal('abcd');
            });
    });

    it('Empty array', () => {
        return Promise
            .each([], () => { })
            .then(completed => {
                completed.should.be.true;
            });
    });
});
