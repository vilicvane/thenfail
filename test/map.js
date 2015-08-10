var assert = require('assert');

var ThenFail = require('../bld/thenfail');

var Promise = ThenFail.Promise;

var ThreeCases = require('./helpers/three-cases');

describe('Feature: map', function () {
    it('Promise.map Should return expected array', function () {
        return Promise
            .map([10, 20, 30], function (value) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(value / 10);
                    }, value);
                });
            })
            .then(function (values) {
                assert.deepEqual(values, [1, 2, 3]);
            });
    });
    
    it('promise.map Should return expected array', function () {
        return Promise
            .resolve([10, 20, 30])
            .map(function (value) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(value / 10);
                    }, value);
                });
            })
            .then(function (values) {
                assert.deepEqual(values, [1, 2, 3]);
            });
    });
});