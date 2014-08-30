var ThenFail = require('../lib/thenfail.js');

module.exports = {
    deferred: function () {
        var promise = new ThenFail();
        return {
            promise: promise,
            resolve: function (value) {
                promise.resolve(value);
            },
            reject: function (reason) {
                promise.reject(reason);
            }
        };
    }
};