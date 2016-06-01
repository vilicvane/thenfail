import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: state', () => {
    context('Fulfilled promises', () => {
        testFulfilled(undefined, (promise, done) => {
            promise.then(() => {
                setTimeout(() => {
                    promise.fulfilled.should.be.true;
                    done();
                }, 0);
            });
        });
    });

    context('Rejected promises', () => {
        testRejected(new Error(), (promise, done) => {
            promise.then(undefined, () => {
                setTimeout(() => {
                    promise.rejected.should.be.true;
                    done();
                }, 0);
            });
        });
    });

    context('Skipped promises', () => {
        it('Synchronously break', done => {
            let promiseA = Promise
                .void
                .then(() => {
                    Promise.break;
                });

            let promiseB = promiseA.then(() => {
                // never run
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Synchronously break in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise
                    .void
                    .then(() => {
                        Promise.break;
                    });
            });

            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Synchronously break but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;

            promiseA = Promise.then(() => {
                return promiseB = Promise
                    .then(() => {
                        Promise.break;
                    })
                    .then(() => { });
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously break', done => {
            let promiseA = Promise.then(() => {
                return Promise.void.break;
            });

            let promiseB = promiseA.then(() => {
                // never run
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously break in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise.then(() => {
                    return Promise.void.break;
                });
            });

            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously break but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;

            promiseA = Promise.then(() => {
                return promiseB = Promise
                    .then(() => {
                        return Promise.void.break;
                    })
                    .then(() => { });
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Synchronously goto', done => {
            let promiseA = Promise
                .void
                .then(() => {
                    Promise.goto('test');
                });

            let promiseB = promiseA.then(() => {
                // never run
            });

            let promiseC = promiseB.label('test', () => { });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                promiseC.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Synchronously goto in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise
                    .void
                    .then(() => {
                        Promise.goto('test');
                    });
            });

            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Synchronously goto but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;

            promiseA = Promise.then(() => {
                return promiseB = Promise
                    .then(() => {
                        Promise.goto('test');
                    })
                    .then(() => { });
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously goto', done => {
            let promiseA = Promise.then(() => {
                return Promise.void.goto('test');
            });

            let promiseB = promiseA.then(() => {
                // never run
            });

            let promiseC = promiseB.label('test', () => { });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                promiseC.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously goto in the last nested chain', done => {
            let promise = Promise.then(() => {
                return Promise.then(() => {
                    return Promise.void.goto('test');
                });
            });

            setTimeout(() => {
                promise.fulfilled.should.be.true;
                done();
            }, 0);
        });

        it('Asynchronously goto but not in the last nested chain', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;

            promiseA = Promise.then(() => {
                return promiseB = Promise
                    .then(() => {
                        return Promise.void.goto('test');
                    })
                    .then(() => { });
            });

            setTimeout(() => {
                promiseA.fulfilled.should.be.true;
                promiseB.skipped.should.be.true;
                done();
            }, 0);
        });

        it('Under a disposed context', done => {
            let promiseA: Promise<void>;

            promiseA = Promise
                .delay(20)
                .then(() => {
                    done('Should not be called');
                });

            setTimeout(() => {
                promiseA.context.dispose();

                setTimeout(() => {
                    promiseA.skipped.should.be.true;
                    done();
                }, 20);
            }, 10);
        });

        it('Under a nested disposed context', done => {
            let promiseA: Promise<void>;
            let promiseB: Promise<void>;

            promiseA = Promise.then(() => {
                return promiseB = Promise
                    .delay(20)
                    .then(() => {
                        done('Should not be called');
                    });
            });

            setTimeout(() => {
                promiseA.context.dispose();

                setTimeout(() => {
                    promiseA.fulfilled.should.be.true;
                    promiseB.skipped.should.be.true;
                    done();
                }, 20);
            }, 10);
        });
    });
});
