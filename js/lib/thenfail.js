/*
* ThenFail v0.1
* Just another Promise/A+ implementation
* https://github.com/vilic/thenfail
*
* By VILIC VANE <https://github.com/vilic>
*/
'use strict';
var si = typeof setImmediate == 'function' ? setImmediate : function (handler) {
    setTimeout(handler, 0);
};

/**
* promise statuses.
*/
var Status;
(function (Status) {
    Status[Status["pending"] = 0] = "pending";
    Status[Status["fulfilled"] = 1] = "fulfilled";
    Status[Status["rejected"] = 2] = "rejected";
})(Status || (Status = {}));

/**
* the instance of class ThenFail is the promise as well as the promise resolver.
*/
var ThenFail = (function () {
    /**
    * create a new ThenFail promise instance by wrapping up given value or thenable
    * if it not a ThenFail promise yet, or create a pending ThenFail promise if no
    * value is given.
    */
    function ThenFail(value) {
        var _this = this;
        /*
        * to make things simpler to understand, a ThenFail instance could be imagined as
        * a relay runner who can relay its "state" to several other runners following
        * steps below:
        * 1. "grasp" the "state" from the previous runner or something invisible.
        * 2. "run" and finish its task.
        * 3. "relay" its "state" to the next runner.
        */
        this._onfulfilled = null;
        this._onrejected = null;
        this._status = 0 /* pending */;
        this._nexts = [];
        if (arguments.length) {
            if (value instanceof ThenFail) {
                return value;
            }

            ThenFail._unpack({}, value, function (status, valueOrReason) {
                _this._grasp(status, valueOrReason);
            });
        }
    }
    /**
    * grasp
    */
    ThenFail.prototype._grasp = function (status, valueOrReason) {
        if (this._status != 0 /* pending */) {
            return;
        }

        var handler;

        switch (status) {
            case 1 /* fulfilled */:
                status = 1 /* fulfilled */;
                handler = this._onfulfilled;
                break;
            case 2 /* rejected */:
                status = 2 /* rejected */;
                handler = this._onrejected;
                break;
        }

        if (handler) {
            this._run(handler, valueOrReason);
        } else {
            this._relay(status, valueOrReason);
        }
    };

    /**
    * run
    */
    ThenFail.prototype._run = function (handler, valueOrReason) {
        var _this = this;
        si(function () {
            var ret;

            try  {
                ret = handler(valueOrReason);
            } catch (e) {
                _this._relay(2 /* rejected */, e);
                return;
            }

            ThenFail._unpack(_this, ret, function (status, valueOrReason) {
                _this._relay(status, valueOrReason);
            });
        });
    };

    /**
    * unpack (resolve)
    */
    ThenFail._unpack = function (thisArg, value, callback) {
        var _this = this;
        if (value == thisArg) {
            callback(2 /* rejected */, new TypeError('the promise should not return itself'));
        } else if (value instanceof ThenFail) {
            if (value._status == 0 /* pending */) {
                value.then(function (value) {
                    callback(1 /* fulfilled */, value);
                }, function (reason) {
                    callback(2 /* rejected */, reason);
                });
            } else {
                callback(value._status, value._valueOrReason);
            }
        } else if (value) {
            switch (typeof value) {
                case 'object':
                case 'function':
                    // ret is thenable
                    var then;
                    try  {
                        then = value.then;
                    } catch (e) {
                        callback(2 /* rejected */, e);
                        break;
                    }

                    if (typeof then == 'function') {
                        var called = false;
                        try  {
                            then.call(value, function (value) {
                                if (!called) {
                                    ThenFail._unpack(_this, value, callback);
                                    called = true;
                                }
                            }, function (reason) {
                                if (!called) {
                                    callback(2 /* rejected */, reason);
                                    called = true;
                                }
                            });
                        } catch (e) {
                            if (!called) {
                                callback(2 /* rejected */, e);
                                called = true;
                            }
                        }
                        break;
                    }
                default:
                    callback(1 /* fulfilled */, value);
                    break;
            }
        } else {
            callback(1 /* fulfilled */, value);
        }
    };

    /**
    * relay
    */
    ThenFail.prototype._relay = function (status, valueOrReason) {
        if (this._status != 0 /* pending */) {
            return;
        }

        this._status = status;
        this._valueOrReason = valueOrReason;
        this._nexts.forEach(function (next) {
            next._grasp(status, valueOrReason);
        });

        this._relax();
    };

    /**
    * relax
    */
    ThenFail.prototype._relax = function () {
        this._onfulfilled = null;
        this._onrejected = null;
        this._nexts = null;
    };

    /**
    * resolve this promise.
    * @param value the value to resolve this promise with, could be a promise.
    */
    ThenFail.prototype.resolve = function (value) {
        var _this = this;
        ThenFail._unpack(this, value, function (status, valueOrReason) {
            _this._grasp(status, valueOrReason);
        });
    };

    /**
    * reject this promise.
    * @param reason the reason to reject this promise with.
    */
    ThenFail.prototype.reject = function (reason) {
        this._grasp(2 /* rejected */, reason);
    };

    /**
    * then method following Promise/A+ specification.
    */
    ThenFail.prototype.then = function (onfulfilled, onrejected) {
        var promise = new ThenFail();

        if (typeof onfulfilled == 'function') {
            promise._onfulfilled = onfulfilled;
        }
        if (typeof onrejected == 'function') {
            promise._onrejected = onrejected;
        }

        if (this._status == 0 /* pending */) {
            this._nexts.push(promise);
        } else {
            promise._grasp(this._status, this._valueOrReason);
        }

        return promise;
    };

    /**
    * a shortcut for `promise.then(null, onrejected)`.
    */
    ThenFail.prototype.fail = function (onrejected) {
        return this.then(null, onrejected);
    };

    /**
    * a helper that delays the relaying of fulfilled value from previous promise.
    * @param interval delay interval (milliseconds).
    */
    ThenFail.prototype.delay = function (interval) {
        return this.then(function (value) {
            var promise = new ThenFail();

            setTimeout(function () {
                promise.resolve(value);
            }, Math.floor(interval) || 0);

            return promise;
        });
    };

    /**
    * a static then shortcut for a promise already fulfilled with value null.
    */
    ThenFail.then = function (onfulfilled) {
        return ThenFail._first.then(onfulfilled);
    };

    /**
    * a static delay shortcut for a promise already fulfilled with value null.
    */
    ThenFail.delay = function (interval) {
        return ThenFail._first.delay(interval);
    };

    /**
    * create a promise that will be fulfilled after all promises (or values) are fulfilled,
    * and will be rejected after at least one promise (or value) is rejected and the others
    * are fulfilled.
    */
    ThenFail.all = function (promises) {
        var allPromise = new ThenFail();
        var values = Array(promises.length);

        var rejected = false;
        var rejectedReason;

        var remain = promises.length;

        promises.forEach(function (promise, i) {
            ThenFail._unpack({}, promise, function (status, valueOrReason) {
                if (status == 1 /* fulfilled */) {
                    values[i] = valueOrReason;
                } else if (!rejected) {
                    rejected = true;
                    rejectedReason = valueOrReason;
                }

                done();
            });
        });

        function done() {
            if (--remain <= 0) {
                if (rejected) {
                    allPromise._grasp(2 /* rejected */, rejectedReason);
                } else {
                    allPromise._grasp(1 /* fulfilled */, values);
                }
            }
        }

        return allPromise;
    };
    ThenFail._first = new ThenFail(null);
    return ThenFail;
})();

var ThenFail;
(function (ThenFail) {
    /**
    * alias for ThenFail.
    */
    ThenFail.Promise = ThenFail;

    
})(ThenFail || (ThenFail = {}));

module.exports = ThenFail;
//# sourceMappingURL=thenfail.js.map
