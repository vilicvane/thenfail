import Promise from '../index';

describe('Feature: break promises chain', () => {
    it('Fake statement Promise.break should break the chain', done => {
        Promise
            .then(() => {
                Promise.break;
            })
            .then(() => {
                done('Did not break');
            })
            .then(() => {
                done('Did not break');
            });
            
        setTimeout(done, 10);
    });
    
    it('Return promise.break should break the chain if previous promise is fulfilled with non-`false` value', done => {
        Promise
            .then(() => {
                return Promise
                    .then(() => { })
                    .break;
            })
            .then(() => {
                done('Did not break');
            });
        
        setTimeout(done, 10);
    });
    
    it('Return promise.break should not break the chain if previous promise is fulfilled with `false`', done => {
        Promise
            .then(() => {
                return Promise
                    .then(() => {
                        return false;
                    })
                    .break;
            })
            .then(() => {
                done();
            });
    });
    
    it('Skipped chain should not continue', done => {
        let promise = Promise
            .then(() => {
                Promise.break;
            })
            .then(() => {
                done('Did not break');
            });
        
        setTimeout(() => {
            promise.then(() => {
                done('Did not break');
            });
            
            setTimeout(done, 10);
        }, 10);
    });
    
    it('Should only break enclosed part', done => {
        Promise
            .resolve('abc')
            .then(() => {
                Promise.break;
            })
            .then(() => {
                done('Did not break');
            })
            .enclose()
            .then(str => {
                if (str !== undefined) {
                    done('str should be undefined');
                } else {
                    done();
                }
            });
    });
    
    it('Should break enclosed part with onrejected handler', done => {
        Promise
            .resolve('abc')
            .then(() => {
                Promise.break;
            })
            .then(() => {
                done('Did not break');
            }, () => {
                done('Did not break');
            })
            .enclose()
            .then(str => {
                if (str !== undefined) {
                    done('str should be undefined');
                } else {
                    done();
                }
            });
    });
    
    context('Should only break current chain', () => {
        it('Break in the last nested then', done => {
            let str = '';
            
            Promise
                .then(() => {
                    return Promise
                        .void
                        .then(() => {
                            Promise.break;
                        });
                })
                .then(() => {
                    str += 'b';
                });
            
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 10);
        });
        
        it('Break but not in the last nested then', done => {
            let str = '';
            
            Promise
                .then(() => {
                    return Promise
                        .then(() => {
                            Promise.break;
                        })
                        .then(() => {
                            str += 'a';
                        });
                })
                .then(() => {
                    str += 'b';
                });
            
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 10);
        });
        
        it('Asynchronously break in the last nested then', done => {
            let str = '';
            
            Promise
                .then(() => {
                    return Promise
                        .void
                        .then(() => {
                            return Promise.void.break;
                        });
                })
                .then(() => {
                    str += 'b';
                });
            
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 10);
        });
        
        it('Asynchronously break but not in the last nested then', done => {
            let str = '';
            
            Promise
                .then(() => {
                    return Promise
                        .then(() => {
                            return Promise.void.break;
                        })
                        .then(() => {
                            str += 'a';
                        });
                })
                .then(() => {
                    str += 'b';
                });
            
            setTimeout(() => {
                str.should.equal('b');
                done();
            }, 10);
        });
    });
    
});
