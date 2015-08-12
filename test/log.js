var Assert = require('assert');

var ThenFail = require('../bld/thenfail');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: log', function () {
    it('Should return the current promise', function () {
        var promise = Promise.void;
        Assert.equal(promise, promise.log());
    });
});