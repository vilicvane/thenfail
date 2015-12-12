import Promise, { Context } from '../index';

describe('Feature: promise context', () => {
    it('Should not be interrupted if context persists', () => {
        let context = new Context();
        
        let count = 0;
        
        return Promise
            .context(context)
            .then(() => {
                count++;
            })
            .then(() => {
                count++;
            })
            .then(() => {
                count.should.equal(2);
            });
    });
    
    it('Should be interrupted if context disposed', done => {
        let context = new Context();
        
        let str = '';
        
        let promise = Promise
            .context(context)
            .then(() => {
                str += 'a';
                
                return new Promise<string>(resolve => {
                    setTimeout(resolve, 20);
                });
            })
            .then(() => {
                str += 'b';
            });
        
        setTimeout(() => {
            context.dispose();
        }, 10);
        
        setTimeout(() => {
            promise.interrupted.should.be.true;
            str.should.equal('a');
            done();
        }, 30);
    });
    
    it('Should not be interrupted if nested context disposed', done => {
        let context = new Context();
        
        let str = '';
        
        Promise
            .then(() => {
                return Promise
                    .context(context)
                    .then(() => {
                        str += 'a';
                        
                        return new Promise<string>(resolve => {
                            setTimeout(resolve, 20);
                        });
                    });
            })
            .then(() => {
                str += 'b';
            });
            
        setTimeout(() => {
            context.dispose();
        }, 10);
        
        setTimeout(() => {
            str.should.equal('ab');
            done();
        }, 30);
    });
    
    it('Should interrupt nested context', done => {
        let str = '';
        
        let promise = Promise
            .then(() => {
                return Promise
                    .then(() => {
                        str += 'a';
                        
                        return new Promise<string>(resolve => {
                            setTimeout(resolve, 20);
                        });
                    })
                    .then(() => {
                        str += 'b';
                    });
            })
            .then(() => {
                str += 'c';
            });
            
        setTimeout(() => {
            promise.context.dispose();
        }, 10);
        
        setTimeout(() => {
            promise.interrupted.should.be.true;
            str.should.equal('a');
            done();
        }, 30);
    });
});
