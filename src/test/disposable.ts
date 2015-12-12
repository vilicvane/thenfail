import Promise, { using } from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

class Resource {
    disposed = false;
    
    dispose() {
        this.disposed = true;
    }
}

describe('Feature: disposable', () => {
    context('Fulfilled promises', () => {
        testFulfilled(undefined, (promise, done) => {
            let disposableResource = Promise
                .when(new Resource())
                .disposable(resource => {
                    resource.dispose();
                });
            
            let resource: Resource;
            
            using(disposableResource, resolvedResource => {
                    resource = resolvedResource;
                    
                    if (resource.disposed) {
                        done('Resource should not be disposed yet');
                    }
                    
                    let usagePromise = new Promise<string>();
                    promise.handle(usagePromise);
                    
                    return usagePromise;
                })
                .then(() => {
                    if (!resource) {
                        done('Resource should not be undefined');
                    } else if (!resource.disposed) {
                        done('Resource should be disposed');
                    } else {
                        done();
                    }
                });
        });
    });
    
    context('Rejected promises', () => {
        testRejected(new Error(), (promise, done) => {
            let disposableResource = Promise
                .when(new Resource())
                .disposable(resource => {
                    resource.dispose();
                });
            
            let resource: Resource;
            
            using(disposableResource, resolvedResource => {
                    resource = resolvedResource;
                    
                    if (resource.disposed) {
                        done('Resource should not be disposed yet');
                    }
                    
                    let usagePromise = new Promise<string>();
                    promise.handle(usagePromise);
                    
                    return usagePromise;
                })
                .then(undefined, () => {
                    if (!resource) {
                        done('Resource should not be undefined');
                    } else if (!resource.disposed) {
                        done('Resource should be disposed');
                    } else {
                        done();
                    }
                });
        });
    });
    
    context('Interrupted promises', () => {
        testFulfilled(undefined, (promise, done) => {
            let disposableResource = Promise
                .when(new Resource())
                .disposable(resource => {
                    resource.dispose();
                });
            
            let resource: Resource;
            
            using(disposableResource, resolvedResource => {
                    resource = resolvedResource;
                    
                    if (resource.disposed) {
                        done('Resource should not be disposed yet');
                    }
                    
                    let usagePromise = new Promise<string>().break;
                    promise.handle(usagePromise);
                    
                    return usagePromise;
                })
                .then(() => {
                    if (!resource) {
                        done('Resource should not be undefined');
                    } else if (!resource.disposed) {
                        done('Resource should be disposed');
                    } else {
                        done();
                    }
                });
        });
    });
    
    it('Timed out promises', done => {
        let disposableResource = Promise
            .when(new Resource())
            .disposable(resource => {
                resource.dispose();
            });
        
            
        let resource: Resource;
        
        let promise = using(disposableResource, resolvedResource => {
                resource = resolvedResource;
                
                if (resource.disposed) {
                    done('Resource should not be disposed yet');
                }
                
                return new Promise<string>(resolve => {
                    setTimeout(resolve, 30);
                });
            })
            .then(() => {
                done('Should not be here');
            });
        
        setTimeout(() => {
            promise.context.dispose();
        
            setTimeout(() => {
                resource.disposed.should.be.true;
                done();
            }, 50);
        }, 10);
    });
    
    it('Timed out nested promises', done => {
        let disposableResource = Promise
            .when(new Resource())
            .disposable(resource => {
                resource.dispose();
            });
        
        let resource: Resource;
        
        let promise = Promise
            .then(() => {
                return using(disposableResource, resolvedResource => {
                    resource = resolvedResource;
                    
                    if (resource.disposed) {
                        done('Resource should not be disposed yet');
                    }
                    
                    return new Promise<string>(resolve => {
                        setTimeout(resolve, 30);
                    });
                });
            })
            .then(() => {
                done('Should not be here');
            });
        
        setTimeout(() => {
            promise.context.dispose();
        
            setTimeout(() => {
                resource.disposed.should.be.true;
                done();
            }, 50);
        }, 10);
    });
});
