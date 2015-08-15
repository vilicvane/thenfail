var ThenFail = require('../../bld/thenfail.js');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

module.exports = {
    // resolved: function (value) {
    //     return Promise.resolved(value);
    // },
    // rejected: function (reason) {
    //     return Promise.rejected(reason);
    // },
    deferred: function () {
        var promise = new Promise();
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