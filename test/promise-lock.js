var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;
var PromiseLock = ThenFail.PromiseLock;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: Promise Lock', function () {
    it('Should lock', function (done) {
        var lock = new PromiseLock();
        var str = '';
        
        lock.lock(function () {
            return Promise
                .delay(20)
                .then(function () {
                    str += 'a';
                });
        });
        
        lock.lock(function () {
            if (str !== 'a') {
                done('Unexpected result');
            }
            
            str += 'b';
        });
        
        lock.lock(function () {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });
    
    it('Should unlock on rejection', function (done) {
        var lock = new PromiseLock();
        var str = '';
        
        lock.lock(function () {
            return Promise
                .delay(20)
                .then(function () {
                    str += 'a';
                    
                    throw {};
                });
        });
        
        lock.lock(function () {
            if (str !== 'a') {
                done('Unexpected result');
            }
            
            str += 'b';
            
            throw new Error();
        });
        
        lock.lock(function () {
            if (str !== 'ab') {
                done('Unexpected result');
            } else {
                done();
            }
        });
    });
});