import Promise from '../index';

describe('Feature: timeout', () => {
    it('Should timeout', done => {
        Promise
            .then(() => {
                return new Promise<void>();
            })
            .timeout(10)
            .then(undefined, reason => {
                if (reason && reason.name === 'TimeoutError') {
                    done();
                } else {
                    done('Unexpected error');
                }
            });
    });
    
    it('Should timeout and cancel chained promises', done => {
        let str = '';
        
        Promise
            .then(() => {
                str += 'a';
                return new Promise<void>(resolve => {
                    setTimeout(resolve, 10);
                });
            })
            .then(() => {
                str += 'b';
                return new Promise<void>(resolve => {
                    setTimeout(resolve, 50);
                });
            })
            .then(() => {
                str += 'c';
            })
            .timeout(30)
            .then(undefined, reason => {
                if (reason && reason.name === 'TimeoutError' && reason.toString() === 'TimeoutError') {
                    setTimeout(() => {
                        if (str === 'ab') {
                            done();
                        } else {
                            done('Should not run chained promise after timed out');
                        }
                    }, 50);
                } else {
                    done('Unexpected error');
                }
            });
    });
    
    it('Should timeout with message', done => {
        Promise
            .then(() => {
                return new Promise<void>();
            })
            .timeout(30, 'i timed out')
            .then(undefined, reason => {
                if (reason && reason.name === 'TimeoutError' && reason.message === 'i timed out') {
                    done();
                } else {
                    done('Unexpected error');
                }
            });
    });
    
    it('Should timeout and dispose nested context', done => {
        let str = '';
        
        Promise
            .then(() => {
                str += 'a';
                return new Promise<void>(resolve => {
                    setTimeout(resolve, 10);
                });
            })
            .then(() => {
                str += 'b';
                return new Promise<void>(resolve => {
                    setTimeout(resolve, 50);
                })
                    .then(() => {
                        str += 'c';
                    });
            })
            .then(() => {
                str += 'd';
            })
            .timeout(30)
            .then(undefined, reason => {
                if (reason && reason.name === 'TimeoutError') {
                    setTimeout(() => {
                        if (str === 'ab') {
                            done();
                        } else {
                            done('Should not run chained promise after timed out');
                        }
                    }, 50);
                } else {
                    done('Unexpected error');
                }
            });
    });
});
