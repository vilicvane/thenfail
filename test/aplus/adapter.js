var ThenFail = require('../../bld/index');

ThenFail.options.disableUnrelayedRejectionWarning = true;

var Promise = ThenFail.Promise;

module.exports = {
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
