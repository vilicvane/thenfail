import * as Sinon from 'sinon';

import Promise, { options } from '../index';

type Spy = Sinon.SinonSpy;

const logger = options.logger;

describe('Feature: log', () => {
    beforeEach(() => {
        Sinon.spy(logger, 'log');
        Sinon.spy(logger, 'warn');
        Sinon.spy(logger, 'error');
    });

    afterEach(() => {
        (logger.log as Spy).restore();
        (logger.warn as Spy).restore();
        (logger.error as Spy).restore();
    });

    function validateCalled(level: string, done: () => void) {
        setTimeout(() => {
            (<any>logger as HashTable<Spy>)[level]
                .calledOnce
                .should.be.true;

            (<any>logger as HashTable<Spy>)[level]
                .getCall(0)
                .args[0]
                .should.match(/unrelayed rejection[^]+\s+at/);

            done();
        }, 0);
    }

    function validateNotCalled(level: string, done: () => void) {
        setTimeout(() => {
            (<any>logger as HashTable<Spy>)[level]
                .notCalled
                .should.be.true;

            done();
        }, 0);
    }

    context('unrelayed rejection', () => {
        it('should warn unrelayed rejection created by `Promise.reject`', done => {
            Promise.reject(new Error());

            validateCalled('warn', done);
        });

        it('should warn unrelayed rejection thrown', done => {
            Promise.then(() => {
                throw new Error();
            });

            validateCalled('warn', done);
        });

        it('should warn rejection handled by an unrelayed promise', done => {
            let promise = new Promise<never>();

            Promise
                .then(() => {
                    throw new Error();
                })
                .handle(promise);

            validateCalled('warn', done);
        });

        it('should warn nested unrelayed rejection', done => {
            Promise.then(() => {
                return Promise.then(() => {
                    throw new Error();
                });
            });

            validateCalled('warn', done);
        });

        it('should warn nested unrelayed rejection created by `Promise.reject`', done => {
            Promise.then(() => {
                return Promise.then(() => {
                    return Promise.reject(new Error());
                });
            });

            validateCalled('warn', done);
        });

        it('should not warn relayed rejection', done => {
            Promise
                .then<void>(() => {
                    throw new Error();
                })
                .fail(() => { });

            validateNotCalled('warn', done);
        });

        it('should not warn relayed rejection created by `Promise.reject`', done => {
            Promise
                .then(() => {
                    return Promise.reject(new Error());
                })
                .fail(() => { });

            validateNotCalled('warn', done);
        });

        it('should not warn nested relayed rejection', done => {
            Promise
                .then(() => {
                    return Promise.then(() => {
                        throw new Error();
                    });
                })
                .log();

            validateNotCalled('warn', done);
        });

        it('should not warn nested relayed rejection created by `Promise.reject`', done => {
            Promise
                .then(() => {
                    return Promise.then(() => {
                        return Promise.reject(new Error());
                    });
                })
                .log();

            validateNotCalled('warn', done);
        });

        it('should not warn relayed rejection handled by a node style callback', done => {
            Promise
                .then(() => {
                    throw new Error();
                })
                .handle(() => { });

            validateNotCalled('warn', done);
        });

        it('should not warn rejection handled by a promise', done => {
            let promise = new Promise<void>();

            promise.fail(() => { });

            Promise
                .then<void>(() => {
                    throw new Error();
                })
                .handle(promise);

            validateNotCalled('warn', done);
        });
    });
});
