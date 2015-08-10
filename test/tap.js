var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: tap', function () {
    it('Should relay the value', function () {
        return Promise
            .true
            .tap(function (value) {
                assert(value === true);
            })
            .tap(function (value) {
                assert(value === true);
                return Promise.delay(10);
            })
            .then(function (value) {
                assert(value === true);
            });
    });
});