var Promise = require('../../bld/thenfail').Promise;

exports.testFulfilled = function (value, test) {
    it('already-fulfilled', function (done) {
        var promise = new Promise();
        promise.resolve(value);
        test(promise, done);
    });

    it('immediately-fulfilled', function (done) {
        var promise = new Promise();
        test(promise, done);
        promise.resolve(value);
    });

    it('eventually-fulfilled', function (done) {
        var promise = new Promise();
        test(promise, done);
        setTimeout(function () {
            promise.resolve(value);
        }, 10);
    });
};

exports.testRejected = function (reason, test) {
    it('already-rejected', function (done) {
        var promise = new Promise();
        promise.reject(reason);
        test(promise, done);
    });

    it('immediately-rejected', function (done) {
        var promise = new Promise();
        test(promise, done);
        promise.reject(reason);
    });

    it('eventually-rejected', function (done) {
        var promise = new Promise();
        test(promise, done);
        setTimeout(function () {
            promise.reject(reason);
        }, 10);
    });
};
