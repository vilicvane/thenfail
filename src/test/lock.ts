import Promise, { Lock } from '../index';

describe('Feature: Lock', () => {
    it('Should queue', done => {
        let lock = new Lock();
        let str = '';

        lock.queue(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';
                });
        });

        lock.queue(() => {
            if (str !== 'a') {
                done('Unexpected result');
            }

            str += 'b';
        });

        lock.queue(() => {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });

    it('Should continue on rejection', done => {
        let lock = new Lock();
        let str = '';

        lock.queue(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';

                    throw {};
                });
        });

        lock.queue(() => {
            if (str !== 'a') {
                done('Unexpected result');
            }

            str += 'b';

            throw new Error();
        });

        lock.queue(() => {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });

    it('Should get queuer', done => {
        let queuer = new Lock().queuer;
        let str = '';

        queuer(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';
                });
        });

        queuer(() => {
            if (str !== 'a') {
                done('Unexpected result');
            }

            str += 'b';
        });

        queuer(() => {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });

    it('Should try', done => {
        let lock = new Lock();
        let str = '';

        lock.try(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';
                });
        });

        lock.try(() => {
            done('Unexpected result');
        });

        lock.queue(() => {
            if (str !== 'a') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });

    it('Should get trier', done => {
        let lock = new Lock();
        let trier = lock.trier;
        let str = '';

        trier(() => {
            return Promise
                .delay(20)
                .then(() => {
                    str += 'a';
                });
        });

        trier(() => {
            done('Unexpected result');
        });

        lock.queue(() => {
            if (str !== 'a') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });
});
