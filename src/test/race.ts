import Promise from '../index';

describe('Feature: race', () => {
    it('First resolved promise should relay its state', () => {
        let promises = [
            new Promise<string>(resolve => {
                resolve('a');
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .should.eventually.equal('a');
    });
    
    it('First resolved promise at second place should relay its state', () => {
        let promises = [
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('a');
                }, 20);
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .should.eventually.equal('b');
    });
    
    it('First resolved promise should relay its state even rejection happens later', () => {
        let promises = [
            new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error());
                }, 20);
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('b');
                }, 10);
            })
        ];
        
        return Promise
            .race(promises)
            .should.eventually.equal('b');
    });
    
    it('First rejected promise should relay its state', () => {
        let error = new Error();
        
        let promises = [
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('a');
                }, 10);
            }),
            Promise.reject<string>(error)
        ];
        
        return Promise
            .race(promises)
            .should.be.rejectedWith(error);
    });
    
    it('First rejected promise should relay its state even if there are multiple rejections', () => {
        let error = new Error();
        
        let promises = [
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('a');
                }, 10);
            }),
            new Promise<string>(resolve => {
                setTimeout(() => {
                    resolve('b');
                }, 10);
            }),
            new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    reject({});
                }, 10);
            }),
            Promise.reject<string>(error)
        ];
        
        return Promise
            .race(promises)
            .should.be.rejectedWith(error);
    });
    
    it('Race empty promises will create a forever-pending promise', done => {
        let promise = Promise.race([]);
        
        setTimeout(() => {
            promise.pending.should.be.true;
            done();
        }, 10);
    });
});
