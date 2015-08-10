/*
 * ThenFail v0.2
 * Just another Promises/A+ implementation
 * https://github.com/vilic/thenfail
 *
 * By VILIC VANE
 * https://github.com/vilic
 *
 * MIT License
 */
'use strict';
if (typeof self === 'undefined') {
    global.self = global;
}
self._thenfailCaptureStartLine = function () { return ThenFail.Utils.captureLine(); };
/**
 * the instance of class ThenFail is the promise as well as the promise resolver.
 */
var ThenFail = (function () {
    function ThenFail(value) {
        var _this = this;
        this._markTime = false;
        this._hasNexts = false;
        this._nexts = [];
        this._baton = {
            state: ThenFail.State.pending
        };
        if (arguments.length) {
            if (value instanceof ThenFail) {
                return value;
            }
            if (typeof value === 'function') {
                try {
                    value(function (value) {
                        _this.resolve(value);
                    }, function (reason) {
                        _this.reject(reason);
                    });
                }
                catch (e) {
                    this.reject(e);
                }
            }
            else {
                ThenFail._unpack({}, value, function (baton, previous) {
                    _this._grab(baton, previous);
                });
            }
        }
        if (ThenFail.longStackTrace) {
            try {
                throw new Error();
            }
            catch (e) {
                this._stack = ThenFail.Utils.filterStackString(e.stack.substr(e.stack.indexOf('\n') + 1));
            }
        }
    }
    /**
     * grab
     */
    ThenFail.prototype._grab = function (baton, previous) {
        if (this._baton.state != ThenFail.State.pending) {
            return;
        }
        if (ThenFail.longStackTrace) {
            this._previous = previous;
        }
        if (this._markTime) {
            baton.time = Date.now();
        }
        var handler;
        switch (baton.state) {
            case ThenFail.State.fulfilled:
                handler = this._onfulfilled;
                break;
            case ThenFail.State.rejected:
                handler = this._onrejected;
                break;
        }
        if (handler) {
            this._run(handler, baton);
        }
        else {
            if (typeof this._onavailassertion === 'function' && !this._onavailassertion.call(null)) {
                return;
            }
            this._relay(baton);
        }
    };
    /**
     * run
     */
    ThenFail.prototype._run = function (handler, baton) {
        var _this = this;
        ThenFail.Utils.nextTick(function () {
            var ret;
            if (typeof _this._onavailassertion === 'function' && !_this._onavailassertion.call(null)) {
                return;
            }
            var time = baton.time;
            try {
                if (baton.state == ThenFail.State.fulfilled) {
                    ret = handler(baton.value);
                }
                else {
                    ret = handler(baton.reason);
                }
            }
            catch (e) {
                if (ThenFail.longStackTrace) {
                    ThenFail._makeStackTraceLong(e, _this);
                }
                _this._relay({
                    state: ThenFail.State.rejected,
                    reason: e,
                    time: baton.time
                });
                return;
            }
            ThenFail._unpack(_this, ret, function (baton, previous) {
                baton.time = time;
                _this._relay(baton, previous);
            });
        });
    };
    /**
     * unpack (resolve)
     */
    ThenFail._unpack = function (thisArg, value, callback) {
        var _this = this;
        if (value == thisArg) {
            callback({
                state: ThenFail.State.rejected,
                reason: new TypeError('the promise should not return itself')
            }, null);
        }
        else if (value instanceof ThenFail) {
            if (ThenFail.longStackTrace && thisArg instanceof ThenFail) {
                thisArg._previous = value;
            }
            var promise = value;
            var baton = promise._baton;
            if (baton.state == ThenFail.State.pending) {
                value
                    .then(function (fulfilledValue) {
                    callback({
                        state: ThenFail.State.fulfilled,
                        value: fulfilledValue
                    }, null);
                }, function (reason) {
                    callback({
                        state: ThenFail.State.rejected,
                        reason: reason
                    }, null);
                });
            }
            else {
                callback(baton, promise);
            }
        }
        else if (value) {
            switch (typeof value) {
                case 'object':
                case 'function':
                    // ret is thenable
                    var then;
                    try {
                        then = value.then;
                    }
                    catch (e) {
                        callback({
                            state: ThenFail.State.rejected,
                            reason: e
                        }, null);
                        break;
                    }
                    if (typeof then === 'function') {
                        var called = false;
                        try {
                            then
                                .call(value, function (value) {
                                if (!called) {
                                    called = true;
                                    ThenFail._unpack(_this, value, callback);
                                }
                            }, function (reason) {
                                if (!called) {
                                    called = true;
                                    callback({
                                        state: ThenFail.State.rejected,
                                        reason: reason
                                    }, null);
                                }
                            });
                        }
                        catch (e) {
                            if (!called) {
                                called = true;
                                callback({
                                    state: ThenFail.State.rejected,
                                    reason: e
                                }, null);
                            }
                        }
                        break;
                    }
                default:
                    callback({
                        state: ThenFail.State.fulfilled,
                        value: value
                    }, null);
                    break;
            }
        }
        else {
            callback({
                state: ThenFail.State.fulfilled,
                value: value
            }, null);
        }
    };
    /**
     * relay
     */
    ThenFail.prototype._relay = function (baton, previous) {
        var _this = this;
        if (this._baton.state != ThenFail.State.pending) {
            return;
        }
        this._baton = {
            state: baton.state,
            value: baton.value,
            reason: baton.reason,
            time: baton.time
        };
        if (this._nexts) {
            this._nexts.forEach(function (next) {
                next._grab(baton, previous || _this);
            });
            if (ThenFail.logRejectionsNotRelayed &&
                baton.state == ThenFail.State.rejected &&
                !this._hasNexts) {
                ThenFail.Utils.nextTick(function () {
                    if (!_this._hasNexts) {
                        ThenFail.Options.Log.errorLogger('A rejection has not been relayed occurs, you may want to add .done() or .log() to the end of every promise.', baton.reason, 'Turn off this message by setting ThenFail.logRejectionsNotRelayed to false.');
                    }
                });
            }
        }
        else if (baton.state == ThenFail.State.rejected) {
            ThenFail.Utils.nextTick(function () {
                throw baton.reason;
            });
        }
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
    ThenFail.prototype.resolve = function (value) {
        var _this = this;
        ThenFail._unpack(this, value, function (baton, previous) {
            _this._grab(baton, previous);
        });
    };
    /**
     * reject this promise.
     * @param reason the reason to reject this promise with.
     */
    ThenFail.prototype.reject = function (reason) {
        this._grab({
            state: ThenFail.State.rejected,
            reason: reason
        }, null);
    };
    ThenFail.prototype.then = function (onfulfilled, onrejected) {
        var promise = new ThenFail();
        promise._onavailassertion = this._onavailassertion;
        if (typeof onfulfilled === 'function') {
            promise._onfulfilled = onfulfilled;
        }
        if (typeof onrejected === 'function') {
            promise._onrejected = onrejected;
        }
        if (this._baton.state == ThenFail.State.pending) {
            this._nexts.push(promise);
        }
        else {
            promise._grab(this._baton, this);
        }
        if (!this._hasNexts) {
            this._hasNexts = true;
        }
        return promise;
    };
    /**
     * add an invisible promise with no nexts to the chain, error will be thrown if it's relayed to this promise (i.e. not handled by parent promises).
     */
    ThenFail.prototype.done = function () {
        var donePromise = this.then();
        donePromise._nexts = null;
    };
    /**
     * add an assertion to the promises chain, if it returns false, the active promises in this chain will stop relaying on.
     * returns the current promise.
     */
    ThenFail.prototype.avail = function (assertion) {
        this._onavailassertion = assertion;
        return this;
    };
    /**
     * mark start time, see also `timeEnd`.
     */
    ThenFail.prototype.time = function () {
        this._markTime = true;
        if (!this.pending) {
            this._baton.time = Date.now();
        }
        return this;
    };
    /**
     * a string contains "{duration}" that will be replaced as the calculated value.
     */
    ThenFail.prototype.timeEnd = function (message) {
        var _this = this;
        if (message === void 0) { message = '{duration}'; }
        this.then(function () {
            var now = Date.now();
            var startTime = _this._baton.time || now;
            message = message.replace('{duration}', now - startTime + 'ms');
            ThenFail.Options.Log.valueLogger(message);
        });
        return this;
    };
    Object.defineProperty(ThenFail.prototype, "pending", {
        /**
         * get a boolean indicates whether the state of this promise is `pending`.
         */
        get: function () {
            return this._baton.state == ThenFail.State.pending;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail.prototype, "fulfilled", {
        /**
         * get a boolean indicates whether the state of this promise is `fulfilled`.
         */
        get: function () {
            return this._baton.state == ThenFail.State.fulfilled;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail.prototype, "rejected", {
        /**
         * get a boolean indicates whether the state of this promise is `rejected`.
         */
        get: function () {
            return this._baton.state == ThenFail.State.rejected;
        },
        enumerable: true,
        configurable: true
    });
    // HELPERS
    /**
     * log the fulfilled value or rejection, or specified value.
     */
    ThenFail.prototype.log = function (object) {
        var hasObjectToLog = !!arguments.length;
        var promise = this
            .then(function (value) {
            if (hasObjectToLog) {
                ThenFail.Options.Log.valueLogger(object);
            }
            else if (value !== undefined) {
                ThenFail.Options.Log.valueLogger(value);
            }
        }, function (reason) {
            if (ThenFail.Options.Log.throwUnhandledRejection) {
                throw reason;
            }
            else {
                ThenFail.Options.Log.errorLogger(reason);
            }
        });
        promise.done();
        return promise;
    };
    /**
     * spread an array argument to arguments directly via `onfulfilled.apply(null, value)`.
     */
    ThenFail.prototype.spread = function (onfulfilled) {
        return this.then(function (args) {
            return onfulfilled.apply(null, args);
        });
    };
    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    ThenFail.prototype.fail = function (onrejected) {
        return this.then(null, onrejected);
    };
    ThenFail.prototype.catch = function (ErrorType, onrejected) {
        if (typeof onrejected === 'function') {
            return this.then(null, function (reason) {
                if (reason instanceof ErrorType) {
                    return onrejected(reason);
                }
                else {
                    throw reason;
                }
            });
        }
        else {
            onrejected = ErrorType;
            return this.then(null, onrejected);
        }
    };
    /**
     * call `onalways` handler when its previous promise get fulfilled or rejected.
     */
    ThenFail.prototype.always = function (onalways) {
        return this
            .then(function (value) {
            return onalways(value, undefined);
        }, function (reason) {
            return onalways(undefined, reason);
        });
    };
    /**
     * a helper that delays the relaying of fulfilled value from previous promise.
     * @param interval delay interval (milliseconds, default to 0).
     */
    ThenFail.prototype.delay = function (interval) {
        var _this = this;
        if (interval === void 0) { interval = 0; }
        return this.then(function (value) {
            var promise = new ThenFail();
            setTimeout(function () {
                promise._grab({
                    state: ThenFail.State.fulfilled,
                    value: value
                }, _this);
            }, Math.floor(interval) || 0);
            return promise;
        });
    };
    /**
     * retry doing something, will be rejected if the failures execeeds limits (defaults to 2).
     * you may either return a rejected promise or throw an error to produce a failure.
     */
    ThenFail.prototype.retry = function (onfulfilled, options) {
        var _this = this;
        options = ThenFail.Utils.defaults(options, ThenFail.Options.Retry);
        return this.then(function (value) {
            var fulfilled = ThenFail.resolved(value);
            var retryPromise = new ThenFail();
            var retry = function (retriesLeft, lastReason) {
                if (lastReason && options.onretry) {
                    options.onretry(retriesLeft, lastReason);
                }
                fulfilled
                    .then(function (value) {
                    return onfulfilled(value);
                })
                    .then(function (value) {
                    retryPromise._grab({
                        state: ThenFail.State.fulfilled,
                        value: value
                    }, _this);
                })
                    .fail(function (reason) {
                    if (retriesLeft) {
                        retry(retriesLeft - 1);
                    }
                    else {
                        retryPromise.reject(reason);
                    }
                });
            };
            retry(options.limit);
            return retryPromise;
        });
    };
    /**
     * resolve current promise in given time (milliseconds) with optional value.
     * the timer starts immediately when this method is called.
     */
    ThenFail.prototype.timeout = function (time, value) {
        var _this = this;
        setTimeout(function () {
            _this.resolve(value);
        }, Math.floor(time));
        return this;
    };
    ThenFail.prototype.handle = function (promiseOrCallback) {
        var _this = this;
        if (promiseOrCallback && typeof promiseOrCallback._grab === 'function') {
            this.then(function (value) {
                promiseOrCallback._grab(_this._baton, _this._previous);
            }, function (reason) {
                promiseOrCallback._grab(_this._baton, _this._previous);
            });
        }
        else if (typeof promiseOrCallback === 'function') {
            this.then(function (value) {
                promiseOrCallback(undefined, value);
            }, function (reason) {
                promiseOrCallback(reason, undefined);
            });
        }
        return this;
    };
    Object.defineProperty(ThenFail.prototype, "void", {
        /**
         * get a promise that will be fulfilled with value `undefined` when its previous promise gets fulfilled.
         */
        get: function () {
            return this.then(function () { });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail.prototype, "true", {
        /**
         * get a promise that will be fulfilled with value `true` when its previous promise gets fulfilled.
         */
        get: function () {
            return this.then(function () { return true; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail.prototype, "false", {
        /**
         * get a promise that will be fulfilled with value `false` when its previous promise gets fulfilled.
         */
        get: function () {
            return this.then(function () { return false; });
        },
        enumerable: true,
        configurable: true
    });
    /**
     * get the nth element in the array returned.
     */
    ThenFail.prototype.first = function () {
        return this.then(function (values) { return values[0]; });
    };
    /**
     * get a promise that will be fulfilled with the value given when its previous promise gets fulfilled.
     */
    ThenFail.prototype.return = function (value) {
        return this.then(function () { return value; });
    };
    Object.defineProperty(ThenFail, "void", {
        // STATIC
        /**
         * get a promise already fulfilled with value `undefined`.
         */
        get: function () {
            return ThenFail.resolved(undefined);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail, "true", {
        /**
         * get a promise already fulfilled with value `true`.
         */
        get: function () {
            return ThenFail.resolved(true);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ThenFail, "false", {
        /**
         * get a promise already fulfilled with value `false`.
         */
        get: function () {
            return ThenFail.resolved(false);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * a static then shortcut of a promise already fulfilled with value `undefined`.
     */
    ThenFail.then = function (onfulfilled) {
        return ThenFail.void.then(onfulfilled);
    };
    /**
     * a static avail shortcut of a promise already fulfilled with value `undefined`.
     */
    ThenFail.avail = function (assertion) {
        return ThenFail.void.avail(assertion);
    };
    /**
     * a static time shortcut of a promise already fulfilled with value `undefined`.
     */
    ThenFail.time = function () {
        return ThenFail.void.time();
    };
    /**
     * a static delay shortcut of a promise already fulfilled with value `undefined`.
     */
    ThenFail.delay = function (interval) {
        return ThenFail.void.delay(interval);
    };
    /**
     * create a promise that will be fulfilled after all promises (or values) get fulfilled,
     * and will be rejected after at least one promise (or value) gets rejected and the others get fulfilled.
     */
    ThenFail.all = function (promises) {
        var allPromise = new ThenFail();
        var values = Array(promises.length);
        var rejected = false;
        var rejectedReason;
        var remain = promises.length;
        if (remain) {
            promises.forEach(function (promise, i) {
                ThenFail._unpack({}, promise, function (baton) {
                    if (baton.state == ThenFail.State.fulfilled) {
                        values[i] = baton.value;
                    }
                    else if (!rejected) {
                        rejected = true;
                        rejectedReason = baton.reason;
                    }
                    done();
                });
            });
        }
        else {
            done();
        }
        function done() {
            if (--remain <= 0) {
                if (rejected) {
                    allPromise._grab({
                        state: ThenFail.State.rejected,
                        reason: rejectedReason
                    }, null);
                }
                else {
                    allPromise._grab({
                        state: ThenFail.State.fulfilled,
                        value: values
                    }, null);
                }
            }
        }
        return allPromise;
    };
    /**
     * a static retry shortcut of a promise already fulfilled with value `undefined`.
     */
    ThenFail.retry = function (onfulfilled, options) {
        return this.void.retry(onfulfilled, options);
    };
    /**
     * transverse an array, if the return value of handler is a promise, it will wait till the promise gets fulfilled. return `false` in the handler to interrupt the transversing.
     * this method returns a promise that will be fulfilled with a boolean, `true` indicates that it completes without interruption, otherwise `false`.
     */
    ThenFail.each = function (items, handler) {
        if (!items) {
            return ThenFail.true;
        }
        var ret = new ThenFail();
        next(0);
        function next(index) {
            if (index >= items.length) {
                ret.resolve(true);
                return;
            }
            var item = items[index];
            ThenFail
                .then(function () {
                return handler(item, index);
            })
                .then(function (result) {
                if (result === false) {
                    ret.resolve(false);
                }
                else {
                    next(index + 1);
                }
            })
                .fail(function (reason) {
                ret.reject(reason);
            });
        }
        return ret;
    };
    /**
     * a promise version of `Array.prototype.map`.
     */
    ThenFail.map = function (items, handler) {
        var mapped = [];
        if (!items) {
            return ThenFail.resolved(mapped);
        }
        var promises = items.map(function (item, i) { return handler(item, i); });
        return ThenFail.all(promises);
    };
    /**
     * create a promise resolved by given value.
     */
    ThenFail.resolved = function (value) {
        var promise = new ThenFail();
        promise.resolve(value);
        return promise;
    };
    ThenFail.rejected = function (reason) {
        var promise = new ThenFail();
        promise.reject(reason);
        return promise;
    };
    // NODE HELPER
    /**
     * invoke a node style async method.
     */
    ThenFail.invoke = function (object, method) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        var promise = new ThenFail();
        try {
            object[method].apply(object, args.concat(function (err, ret) {
                if (err) {
                    promise.reject(err);
                }
                else {
                    promise.resolve(ret);
                }
            }));
        }
        catch (e) {
            promise.reject(e);
        }
        return promise;
    };
    /**
     * call a node style async function.
     */
    ThenFail.call = function (fn) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var promise = new ThenFail();
        try {
            fn.apply(null, args.concat(function (err, ret) {
                if (err) {
                    promise.reject(err);
                }
                else {
                    promise.resolve(ret);
                }
            }));
        }
        catch (e) {
            promise.reject(e);
        }
        return promise;
    };
    // OTHERS
    ThenFail._makeStackTraceLong = function (error, promise) {
        var STACK_JUMP_SEPARATOR = 'From previous event:';
        if (promise._stack &&
            error && error.stack &&
            error.stack.indexOf(STACK_JUMP_SEPARATOR) < 0) {
            var stacks = [ThenFail.Utils.filterStackString(error.stack)];
            for (var p = promise; p; p = p._previous) {
                if (p._stack) {
                    stacks.push(p._stack);
                }
            }
            var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
            error.stack = concatedStacks;
        }
    };
    return ThenFail;
})();
var ThenFail;
(function (ThenFail) {
    /**
     * log rejections not been relayed.
     */
    ThenFail.logRejectionsNotRelayed = true;
    /**
     * chain the stack trace for debugging reason.
     * this has serious performance impact, never use in production.
     */
    ThenFail.longStackTrace = false;
    /**
     * promise states.
     */
    (function (State) {
        State[State["pending"] = 0] = "pending";
        State[State["fulfilled"] = 1] = "fulfilled";
        State[State["rejected"] = 2] = "rejected";
    })(ThenFail.State || (ThenFail.State = {}));
    var State = ThenFail.State;
    /**
     * alias for ThenFail.
     */
    ThenFail.Promise = ThenFail;
    /**
     * A small helper class to queue async operations.
     */
    var PromiseLock = (function () {
        function PromiseLock() {
            this._promise = ThenFail.void;
        }
        /**
         * handler will be called once this promise lock is unlocked, and it will be locked again until the promise returned by handler get fulfilled.
         */
        PromiseLock.prototype.lock = function (handler, unlockOnRejection) {
            if (unlockOnRejection === void 0) { unlockOnRejection = true; }
            var promise = this._promise.then(handler);
            this._promise = promise
                .fail(function (reason) {
                if (!unlockOnRejection) {
                    throw reason;
                }
                else {
                    promise.log();
                }
            })
                .void;
            return promise;
        };
        PromiseLock.prototype.ready = function (handler) {
            return this._promise.then(handler);
        };
        return PromiseLock;
    })();
    ThenFail.PromiseLock = PromiseLock;
    /**
     * default settings
     */
    var Options;
    (function (Options) {
        /**
         * default settings for retry
         */
        var Retry;
        (function (Retry) {
            // number of times to retry, defaults to 2.
            Retry.limit = 2;
            // interval (milliseconds) between every retry, defaults to 0.
            Retry.interval = 0;
            // max interval (milliseconds) for retry if interval multiplier is applied, defaults to Infinity.
            Retry.maxInterval = Infinity;
            // the multiplier that will be applied to the interval each time after retry, defaults to 1.
            Retry.intervalMultiplier = 1;
            // a handler that will be triggered when retries happens.
            Retry.onretry = null;
        })(Retry = Options.Retry || (Options.Retry = {}));
        /**
         * `log()` settings
         */
        var Log;
        (function (Log) {
            /**
             * whether to throw unhandled rejection when using `log()`.
             */
            Log.throwUnhandledRejection = false;
            /**
             * value logger for `log()`.
             */
            Log.valueLogger = function () {
                var values = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    values[_i - 0] = arguments[_i];
                }
                values.forEach(function (value) {
                    if (value instanceof Object) {
                        console.log(JSON.stringify(value, null, '    '));
                    }
                    else {
                        console.log(value);
                    }
                });
            };
            /**
             * error logger for `log()`.
             */
            Log.errorLogger = function () {
                var reasons = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    reasons[_i - 0] = arguments[_i];
                }
                reasons.forEach(function (reason) {
                    if (reason instanceof Error) {
                        console.warn(reason.stack || reason);
                    }
                    else if (reason instanceof Object) {
                        console.warn(JSON.stringify(reason, null, '    '));
                    }
                    else {
                        console.warn(reason);
                    }
                });
            };
        })(Log = Options.Log || (Options.Log = {}));
    })(Options = ThenFail.Options || (ThenFail.Options = {}));
    var Utils;
    (function (Utils) {
        /**
         * defaults helper
         */
        function defaults(options, defaultOptions) {
            var hop = Object.prototype.hasOwnProperty;
            options = options || {};
            var result = {};
            for (var name in defaultOptions) {
                if (hop.call(options, name)) {
                    result[name] = options[name];
                }
                else {
                    result[name] = defaultOptions[name];
                }
            }
            return result;
        }
        Utils.defaults = defaults;
        /**
         * from Q.
         */
        Utils.nextTick = (function () {
            // linked list of tasks (single, with head node)
            var head = {};
            var tail = head;
            var flushing = false;
            var requestTick = null;
            var isNodeJS = false;
            function flush() {
                while (head.next) {
                    head = head.next;
                    var task = head.task;
                    head.task = null;
                    var domain = head.domain;
                    if (domain) {
                        head.domain = null;
                        domain.enter();
                    }
                    try {
                        task();
                    }
                    catch (e) {
                        if (isNodeJS) {
                            // In node, uncaught exceptions are considered fatal errors.
                            // Re-throw them synchronously to interrupt flushing!
                            // Ensure continuation if the uncaught exception is suppressed
                            // listening "uncaughtException" events (as domains does).
                            // Continue in next event to avoid tick recursion.
                            if (domain) {
                                domain.exit();
                            }
                            setTimeout(flush, 0);
                            if (domain) {
                                domain.enter();
                            }
                            throw e;
                        }
                        else {
                            // In browsers, uncaught exceptions are not fatal.
                            // Re-throw them asynchronously to avoid slow-downs.
                            setTimeout(function () {
                                throw e;
                            }, 0);
                        }
                    }
                    if (domain) {
                        domain.exit();
                    }
                }
                flushing = false;
            }
            var nextTick = function (task) {
                tail = tail.next = {
                    task: task,
                    domain: isNodeJS && process.domain,
                    next: null
                };
                if (!flushing) {
                    flushing = true;
                    requestTick();
                }
            };
            if (typeof process !== 'undefined' && process.nextTick) {
                // Node.js before 0.9. Note that some fake-Node environments, like the
                // Mocha test runner, introduce a `process` global without a `nextTick`.
                isNodeJS = true;
                requestTick = function () {
                    process.nextTick(flush);
                };
            }
            else if (typeof setImmediate === 'function') {
                // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
                if (typeof window !== 'undefined') {
                    requestTick = setImmediate.bind(window, flush);
                }
                else {
                    requestTick = function () {
                        setImmediate(flush);
                    };
                }
            }
            else if (typeof MessageChannel !== 'undefined') {
                // modern browsers
                // http://www.nonblocking.io/2011/06/windownexttick.html
                var channel = new MessageChannel();
                // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
                // working message ports the first time a page loads.
                channel.port1.onmessage = function () {
                    requestTick = requestPortTick;
                    channel.port1.onmessage = flush;
                    flush();
                };
                var requestPortTick = function () {
                    // Opera requires us to provide a message payload, regardless of
                    // whether we use it.
                    channel.port2.postMessage(0);
                };
                requestTick = function () {
                    setTimeout(flush, 0);
                    requestPortTick();
                };
            }
            else {
                // old browsers
                requestTick = function () {
                    setTimeout(flush, 0);
                };
            }
            return nextTick;
        })();
        var thenfailFileName;
        var thenfailStartLine;
        var thenfailEndLine;
        function getFileNameAndLineNumber(stackLine) {
            // Named functions: "at functionName (filename:lineNumber:columnNumber)"
            // In IE10 function name can have spaces ("Anonymous function") O_o
            var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
            if (attempt1) {
                return [attempt1[1], Number(attempt1[2])];
            }
            // Anonymous functions: "at filename:lineNumber:columnNumber"
            var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
            if (attempt2) {
                return [attempt2[1], Number(attempt2[2])];
            }
            // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
            var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
            if (attempt3) {
                return [attempt3[1], Number(attempt3[2])];
            }
        }
        function isNodeFrame(stackLine) {
            return /\((?:module|node)\.js:/.test(stackLine);
        }
        function isInternalFrame(stackLine) {
            var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
            if (!fileNameAndLineNumber) {
                return false;
            }
            var fileName = fileNameAndLineNumber[0];
            var lineNumber = fileNameAndLineNumber[1];
            return fileName == thenfailFileName && lineNumber >= thenfailStartLine && lineNumber <= thenfailEndLine;
        }
        function filterStackString(stackString) {
            var lines = stackString.split('\n');
            var desiredLines = [];
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];
                if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
                    desiredLines.push(line);
                }
            }
            return desiredLines.join('\n');
        }
        Utils.filterStackString = filterStackString;
        function captureLine() {
            try {
                throw new Error();
            }
            catch (e) {
                var lines = e.stack.split('\n');
                var firstLine = lines[0].indexOf('@') > 0 ? lines[1] : lines[2];
                var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
                if (!fileNameAndLineNumber) {
                    return;
                }
                thenfailFileName = fileNameAndLineNumber[0];
                return fileNameAndLineNumber[1];
            }
        }
        Utils.captureLine = captureLine;
        function captureBoundaries() {
            thenfailStartLine = self._thenfailCaptureStartLine();
            thenfailEndLine = self._thenfailCaptureEndLine();
            delete self._thenfailCaptureStartLine;
            delete self._thenfailCaptureEndLine;
        }
        Utils.captureBoundaries = captureBoundaries;
    })(Utils = ThenFail.Utils || (ThenFail.Utils = {}));
})(ThenFail || (ThenFail = {}));
self._thenfailCaptureEndLine = function () { return ThenFail.Utils.captureLine(); };
ThenFail.Utils.captureBoundaries();
module.exports = ThenFail;
//#end if
//# sourceMappingURL=thenfail.js.map