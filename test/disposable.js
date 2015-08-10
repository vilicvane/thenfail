var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;
var using = ThenFail.using;

var ThreeCases = require('./helpers/three-cases');

function Resource() {
    this.disposed = false;
}

Resource.prototype.dispose = function () {
    this.disposed = true;
};

describe('Feature: disposable', function () {
    context('Fulfilled promises', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            var disposableResource = Promise
                .when(new Resource())
                .disposable(function (resource) {
                    resource.dispose();
                });
            
            var resource;
            
            using(disposableResource, function (resolvedResource) {
                resource = resolvedResource;
                
                if (resource.disposed) {
                    done('Resource should not be disposed yet');
                }
                
                var usagePromise = new Promise();
                promise.handle(usagePromise);
                
                return usagePromise;
            })
                .then(function () {
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
    
    context('Rejected promises', function () {
        ThreeCases.testRejected(undefined, function (promise, done) {
            var disposableResource = Promise
                .when(new Resource())
                .disposable(function (resource) {
                    resource.dispose();
                });
            
            var resource;
            
            using(disposableResource, function (resolvedResource) {
                resource = resolvedResource;
                
                if (resource.disposed) {
                    done('Resource should not be disposed yet');
                }
                
                var usagePromise = new Promise();
                promise.handle(usagePromise);
                
                return usagePromise;
            })
                .then(undefined, function () {
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
    
    context('Interrupted promises', function () {
        ThreeCases.testFulfilled(undefined, function (promise, done) {
            var disposableResource = Promise
                .when(new Resource())
                .disposable(function (resource) {
                    resource.dispose();
                });
            
            var resource;
            
            using(disposableResource, function (resolvedResource) {
                resource = resolvedResource;
                
                if (resource.disposed) {
                    done('Resource should not be disposed yet');
                }
                
                var usagePromise = new Promise().break;
                promise.handle(usagePromise);
                
                return usagePromise;
            })
                .then(function () {
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
    
    it('Timed out promises', function (done) {
        var disposableResource = Promise
            .when(new Resource())
            .disposable(function (resource) {
                resource.dispose();
            });
        
        var resource;
        
        var promise = using(disposableResource, function (resolvedResource) {
            resource = resolvedResource;
            
            if (resource.disposed) {
                done('Resource should not be disposed yet');
            }
            
            return new Promise(function (resolve) {
                setTimeout(resolve, 30);
            });
        })
            .then(function () {
                done('Should not be here');
            });
        
        setTimeout(function () {
            promise.context.dispose();
        
            setTimeout(function () {
                assert.equal(resource.disposed, true);
                done();
            }, 50);
        }, 10);
    });
    
    it('Timed out nested promises', function (done) {
        var disposableResource = Promise
            .when(new Resource())
            .disposable(function (resource) {
                resource.dispose();
            });
        
        var resource;
        
        var promise = Promise
            .then(function () {
                return using(disposableResource, function (resolvedResource) {
                    resource = resolvedResource;
                    
                    if (resource.disposed) {
                        done('Resource should not be disposed yet');
                    }
                    
                    return new Promise(function (resolve) {
                        setTimeout(resolve, 30);
                    });
                });
            })
            .then(function () {
                done('Should not be here');
            });
        
        setTimeout(function () {
            promise.context.dispose();
        
            setTimeout(function () {
                assert.equal(resource.disposed, true);
                done();
            }, 50);
        }, 10);
    });
});