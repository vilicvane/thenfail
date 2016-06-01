import Promise from '../index';

describe('Feature: goto label', () => {
    it('Fake statement Promise.goto should goto given label', done => {
        Promise
            .then(() => {
                Promise.goto('test');
            })
            .then(() => {
                done('Should be skipped');
            })
            .label('test', () => done());
    });

    it('Fake statement Promise.goto should goto given label when multiple labels set', done => {
        Promise
            .then(() => {
                Promise.goto('test', 123);
            })
            .then(() => done('Should be skipped'))
            .label('xxx', () => {
                done('Should be skipped');
                return 456;
            })
            .label('test', (value: number) => {
                value.should.equal(123);
                done();
            });
    });

    it('Return promise.goto should goto given label if previous promise is fulfilled with non-`false` value', done => {
        Promise
            .then(() => {
                return Promise
                    .then(() => { })
                    .goto('test');
            })
            .then(() => {
                done('Should be skipped');
            })
            .label('test', () => done());
    });

    it('Return promise.goto should not goto the chain if previous promise is fulfilled with `false`', done => {
        let called = false;

        Promise
            .then(() => {
                return Promise
                    .then(() => {
                        return false;
                    })
                    .goto('test', 'abc');
            })
            .then(() => {
                called = true;
                return 'def';
            })
            .label('test', value => {
                value.should.equal('def');
                called.should.be.true;
                done();
            });
    });

    it('Should not goto label if it was not present at the beginning', done => {
        let promise = Promise
            .then(() => {
                Promise.goto('test');
            })
            .then(() => done('Should be skipped'));

        setTimeout(() => {
            promise
                .then(() => done('Should be skipped'))
                .label('test', () => done('Should not be called'));

            setTimeout(done, 10);
        }, 10);
    });

    it('Should goto label after onrejected handler', done => {
        Promise
            .resolve('abc')
            .then(() => {
                Promise.goto('test');
            })
            .then(() => {
                done('Should be skipped');
            }, () => {
                done('Should be skipped');
            })
            .label('test', str => {
                if (str !== undefined) {
                    done('str should be undefined');
                } else {
                    done();
                }
            });
    });

    context('Should only goto within current chain', () => {
        it('goto in the last nested then', done => {
            let str = '';

            Promise
                .then(() => {
                    return Promise
                        .void
                        .then(() => {
                            str += 'a';
                            Promise.goto('test');
                        });
                })
                .then(() => {
                    str += 'b';
                })
                .label('test', () => {
                    str += 'c';
                });

            setTimeout(() => {
                str.should.equal('abc');
                done();
            }, 10);
        });

        it('goto but not in the last nested then', done => {
            let str = '';

            Promise
                .then(() => {
                    return Promise
                        .then(() => {
                            Promise.goto('test');
                        })
                        .then(() => {
                            str += 'a';
                        });
                })
                .then(() => {
                    str += 'b';
                })
                .label('test', () => {
                    str += 'c';
                });

            setTimeout(() => {
                str.should.equal('bc');
                done();
            }, 10);
        });

        it('Asynchronously goto in the last nested then', done => {
            let str = '';

            Promise
                .then(() => {
                    return Promise
                        .void
                        .then(() => {
                            str += 'a';
                            return Promise.void.goto('test');
                        });
                })
                .then(() => {
                    str += 'b';
                })
                .label('test', () => {
                    str += 'c';
                });

            setTimeout(() => {
                str.should.equal('abc');
                done();
            }, 10);
        });

        it('Asynchronously goto but not in the last nested then', done => {
            let str = '';

            Promise
                .then(() => {
                    return Promise
                        .then(() => {
                            return Promise.void.goto('test');
                        })
                        .then(() => {
                            str += 'a';
                        });
                })
                .then(() => {
                    str += 'b';
                })
                .label('test', () => {
                    str += 'c';
                });

            setTimeout(() => {
                str.should.equal('bc');
                done();
            }, 10);
        });
    });

});
