/**
 * ThenFail v0.3
 * Just another Promises/A+ Library
 *
 * https://github.com/vilic/thenfail
 *
 * MIT License
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './utils'], factory);
    }
})(function (require, exports) {
    var utils_1 = require('./utils');
    var Context = (function () {
        function Context() {
            this._disposed = false;
            this._enclosed = false;
        }
        Object.defineProperty(Context.prototype, "disposed", {
            /**
             * (get) A boolean that indicates whether this promise context is disposed.
             * See https://github.com/vilic/thenfail# for more information.
             */
            get: function () {
                return this._disposed;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Context.prototype, "enclosed", {
            /**
             * (get) A boolean that indicates whether this promise context is enclosed.
             * See https://github.com/vilic/thenfail# for more information.
             */
            get: function () {
                return this._enclosed;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Dispose this promise context.
         * See https://github.com/vilic/thenfail# for more information.
         */
        Context.prototype.dispose = function () {
            this._disposed = true;
            this.disposeSubContexts();
        };
        /**
         * Dispose all sub contexts of this promise context.
         */
        Context.prototype.disposeSubContexts = function () {
            if (this._subContexts) {
                for (var _i = 0, _a = this._subContexts; _i < _a.length; _i++) {
                    var context_1 = _a[_i];
                    context_1.dispose();
                }
                this._subContexts = undefined;
            }
        };
        return Context;
    })();
    exports.Context = Context;
    /**
     * Possible states of a promise.
     */
    var State;
    (function (State) {
        State[State["pending"] = 0] = "pending";
        State[State["fulfilled"] = 1] = "fulfilled";
        State[State["rejected"] = 2] = "rejected";
        State[State["interrupted"] = 3] = "interrupted";
    })(State || (State = {}));
    /**
     * TimeoutError class.
     */
    var TimeoutError = (function (_super) {
        __extends(TimeoutError, _super);
        function TimeoutError() {
            _super.apply(this, arguments);
            this.name = 'TimeoutError';
        }
        return TimeoutError;
    })(Error);
    exports.TimeoutError = TimeoutError;
    /**
     * The signal objects for interrupting promises context.
     */
    var BREAK_SIGNAL = {};
    var PRE_BREAK_SIGNAL = {};
    /**
     * ThenFail promise options.
     */
    exports.options = {
        disableUnrelayedRejectionWarning: false
    };
    // The core abstraction of this implementation is to imagine the behavior of promises
    // as relay runners.
    //  1. Grab the baton state (and value/reason).
    //  2. Run and get its own state.
    //  3. Relay the new state to next runners.
    var Promise = (function () {
        function Promise(resolverOrContext) {
            var _this = this;
            /** Current state of this promise. */
            this._state = 0 /* pending */;
            /**
             * Indicates whether `onfulfilled` or `onrejected` handler has been called
             * but the resolved value has not become fulfilled yet.
             */
            this._running = false;
            if (resolverOrContext instanceof Context && !resolverOrContext._enclosed) {
                this._context = resolverOrContext;
            }
            else {
                this._context = new Context();
            }
            if (typeof resolverOrContext === 'function') {
                try {
                    resolverOrContext(function (value) { return _this.resolve(value); }, function (reason) { return _this.reject(reason); });
                }
                catch (error) {
                    this.reject(error);
                }
            }
        }
        /**
         * Get the state from previous promise in chain.
         */
        Promise.prototype._grab = function (previousState, previousTOrReason) {
            if (this._state !== 0 /* pending */) {
                return;
            }
            var handler;
            if (previousState === 1 /* fulfilled */) {
                handler = this._onPreviousFulfilled;
            }
            else if (previousState === 2 /* rejected */) {
                handler = this._onPreviousRejected;
            }
            if (handler) {
                this._run(handler, previousTOrReason);
            }
            else {
                this._relay(previousState, previousTOrReason);
            }
        };
        /**
         * Invoke `onfulfilled` or `onrejected` handlers.
         */
        Promise.prototype._run = function (handler, previousTOrReason) {
            var _this = this;
            this._running = true;
            utils_1.asap(function () {
                var resolvable;
                try {
                    resolvable = handler(previousTOrReason);
                }
                catch (error) {
                    _this._relay(2 /* rejected */, error);
                    _this._running = false;
                    return;
                }
                _this._unpack(resolvable, function (state, valueOrReason) {
                    _this._relay(state, valueOrReason);
                    _this._running = false;
                });
            });
        };
        /**
         * The resolve process defined in Promises/A+ specifications.
         */
        Promise.prototype._unpack = function (value, callback) {
            var _this = this;
            if (this === value) {
                callback(2 /* rejected */, new TypeError('The promise should not return itself'));
            }
            else if (value instanceof Promise) {
                if (value._state === 0 /* pending */) {
                    if (value._handledPromise) {
                        value._handledPromises = [value._handledPromise, this];
                        value._handledPromise = undefined;
                    }
                    else if (value._handledPromises) {
                        value._handledPromises.push(this);
                    }
                    else {
                        value._handledPromise = this;
                    }
                    var context_2 = this._context;
                    if (context_2._subContexts) {
                        context_2._subContexts.push(value._context);
                    }
                    else {
                        context_2._subContexts = [value._context];
                    }
                }
                else {
                    callback(value._state, value._valueOrReason);
                }
            }
            else if (value) {
                switch (typeof value) {
                    case 'object':
                    case 'function':
                        try {
                            var then = value.then;
                            if (typeof then === 'function') {
                                then.call(value, function (value) {
                                    if (callback) {
                                        _this._unpack(value, callback);
                                        callback = undefined;
                                    }
                                }, function (reason) {
                                    if (callback) {
                                        callback(2 /* rejected */, reason);
                                        callback = undefined;
                                    }
                                });
                                break;
                            }
                        }
                        catch (e) {
                            if (callback) {
                                callback(2 /* rejected */, e);
                                callback = undefined;
                            }
                            break;
                        }
                    default:
                        callback(1 /* fulfilled */, value);
                        break;
                }
            }
            else {
                callback(1 /* fulfilled */, value);
            }
        };
        /**
         * Set the state of current promise and relay it to next promises.
         */
        Promise.prototype._relay = function (state, valueOrReason) {
            var _this = this;
            if (this._state !== 0 /* pending */) {
                return;
            }
            var relayState;
            if (valueOrReason === BREAK_SIGNAL ||
                valueOrReason === PRE_BREAK_SIGNAL ||
                this._context._disposed) {
                relayState = 3 /* interrupted */;
                if (this._running) {
                    this._state = 1 /* fulfilled */;
                    if (this._onPreviousInterrupted) {
                        try {
                            var handler = this._onPreviousInterrupted;
                            handler();
                        }
                        catch (error) {
                            relayState = 2 /* rejected */;
                            valueOrReason = error;
                        }
                    }
                }
                else {
                    this._state = 3 /* interrupted */;
                }
            }
            else {
                relayState = state;
                this._state = state;
                this._valueOrReason = valueOrReason;
            }
            if (relayState === 3 /* interrupted */) {
                if (this._chainedPromise) {
                    if (this._chainedPromise._context === this._context) {
                        this._chainedPromise._relay(3 /* interrupted */);
                    }
                    else {
                        this._chainedPromise._grab(1 /* fulfilled */);
                    }
                }
                else if (this._chainedPromises) {
                    for (var _i = 0, _a = this._chainedPromises; _i < _a.length; _i++) {
                        var promise = _a[_i];
                        if (promise._context === this._context) {
                            promise._relay(3 /* interrupted */);
                        }
                        else {
                            promise._grab(1 /* fulfilled */);
                        }
                    }
                }
                relayState = 1 /* fulfilled */;
                if (valueOrReason === PRE_BREAK_SIGNAL) {
                    valueOrReason = BREAK_SIGNAL;
                }
                else {
                    valueOrReason = undefined;
                }
                if (this._handledPromise) {
                    this._handledPromise._relay(relayState, valueOrReason);
                }
                else if (this._handledPromises) {
                    for (var _b = 0, _c = this._handledPromises; _b < _c.length; _b++) {
                        var promise = _c[_b];
                        promise._relay(relayState, valueOrReason);
                    }
                }
            }
            else {
                if (this._chainedPromise) {
                    this._chainedPromise._grab(relayState, valueOrReason);
                }
                else if (this._chainedPromises) {
                    for (var _d = 0, _e = this._chainedPromises; _d < _e.length; _d++) {
                        var promise = _e[_d];
                        promise._grab(relayState, valueOrReason);
                    }
                }
                if (this._handledPromise) {
                    this._handledPromise._relay(relayState, valueOrReason);
                }
                else if (this._handledPromises) {
                    for (var _f = 0, _g = this._handledPromises; _f < _g.length; _f++) {
                        var promise = _g[_f];
                        promise._relay(relayState, valueOrReason);
                    }
                }
            }
            utils_1.asap(function () {
                if (state === 2 /* rejected */) {
                    var relayed = !!(_this._chainedPromise || _this._chainedPromises || _this._handledPromise || _this._handledPromises);
                    if (!exports.options.disableUnrelayedRejectionWarning && !relayed) {
                        var error = valueOrReason && (valueOrReason.stack || valueOrReason.message) || valueOrReason;
                        console.warn("An unrelayed rejection happens:\n" + error);
                    }
                }
                if (_this._onPreviousFulfilled) {
                    _this._onPreviousFulfilled = undefined;
                }
                if (_this._onPreviousRejected) {
                    _this._onPreviousRejected = undefined;
                }
                if (_this._onPreviousInterrupted) {
                    _this._onPreviousInterrupted = undefined;
                }
                if (_this._chainedPromise) {
                    _this._chainedPromise = undefined;
                }
                else {
                    _this._chainedPromises = undefined;
                }
                if (_this._handledPromise) {
                    _this._handledPromise = undefined;
                }
                else {
                    _this._handledPromises = undefined;
                }
            });
        };
        // https://github.com/Microsoft/TypeScript/issues/5667
        // then(onfulfilled: void, onrejected?: OnRejectedHandler<T>): Promise<T>;
        Promise.prototype.then = function (onfulfilled, onrejected) {
            var promise = new Promise(this._context);
            if (typeof onfulfilled === 'function') {
                promise._onPreviousFulfilled = onfulfilled;
            }
            if (typeof onrejected === 'function') {
                promise._onPreviousRejected = onrejected;
            }
            if (this._state === 0 /* pending */) {
                if (this._chainedPromise) {
                    this._chainedPromises = [this._chainedPromise, promise];
                    this._chainedPromise = undefined;
                }
                else if (this._chainedPromises) {
                    this._chainedPromises.push(promise);
                }
                else {
                    this._chainedPromise = promise;
                }
            }
            else {
                promise._grab(this._state, this._valueOrReason);
            }
            return promise;
        };
        /**
         * Resolve the promise with a value or thenable.
         * @param resolvable The value to fulfill or thenable to resolve.
         */
        Promise.prototype.resolve = function (resolvable) {
            var _this = this;
            this._unpack(resolvable, function (state, valueOrReason) { return _this._grab(state, valueOrReason); });
        };
        /**
         * Reject this promise with a reason.
         * @param reason Rejection reason.
         */
        Promise.prototype.reject = function (reason) {
            this._grab(2 /* rejected */, reason);
        };
        /**
         * Set up the interruption handler of the promise.
         * An interruption handler will be called if either the `onfulfilled`
         * or `onrejected` handler of the promise has been called but
         * interrupted for some reason
         * (by break signal or the canceling of the context).
         * @param oninerrupted Interruption handler.
         * @returns Current promise.
         */
        Promise.prototype.interruption = function (oninterrupted) {
            if (this._state === 0 /* pending */) {
                if (this._onPreviousInterrupted) {
                    throw new Error('Interruption handler has already been set');
                }
                this._onPreviousInterrupted = oninterrupted;
            }
            else {
                // To unify error handling behavior, handler would not be invoked
                // if it's added after promise state being no longer pending.
                console.warn('Handler added after promise state no longer being pending');
            }
            return this;
        };
        /**
         * Enclose current promise context.
         * @returns Current promise.
         */
        Promise.prototype.enclose = function () {
            this._context._enclosed = true;
            return this;
        };
        /**
         * Create a promise that will be fulfilled in given time after
         * its previous promise becomes fulfilled.
         * The fulfilled value will be relayed.
         * @param timeout Timeout in milliseconds.
         * @returns Current promise.
         */
        Promise.prototype.delay = function (timeout) {
            return this.then(function (value) {
                return new Promise(function (resolve) {
                    setTimeout(function () { return resolve(value); }, Math.floor(timeout) || 0);
                });
            });
        };
        /**
         * Reject the promise with `TimeoutError` if it's still pending after
         * timeout. The timer starts once this method is called
         * (usually before the fulfillment of previous promise).
         * @param timeout Tiemout in milliseconds.
         * @returns Current promise.
         */
        Promise.prototype.timeout = function (timeout) {
            var _this = this;
            this._context._enclosed = true;
            setTimeout(function () {
                if (_this._state === 0 /* pending */) {
                    _this._relay(2 /* rejected */, new TimeoutError());
                    _this._context.disposeSubContexts();
                }
            }, Math.floor(timeout) || 0);
            return this;
        };
        Promise.prototype.handle = function (promiseOrCallback) {
            if (promiseOrCallback instanceof Promise) {
                if (this._state === 0 /* pending */) {
                    if (this._handledPromise) {
                        this._handledPromises = [this._handledPromise, promiseOrCallback];
                        this._handledPromise = undefined;
                    }
                    else if (this._handledPromises) {
                        this._handledPromises.push(promiseOrCallback);
                    }
                    else {
                        this._handledPromise = promiseOrCallback;
                    }
                }
                else {
                    promiseOrCallback._relay(this._state, this._valueOrReason);
                }
            }
            else if (typeof promiseOrCallback === 'function') {
                this.then(function (value) {
                    promiseOrCallback(undefined, value);
                }, function (reason) {
                    promiseOrCallback(reason, undefined);
                });
            }
            else {
                throw new TypeError('Unsupported type to handle');
            }
            return this;
        };
        /**
         * Create a disposable resource promise.
         * @param disposor A synchronous function to handle resource disposing.
         * @returns Created disposable resource promise.
         */
        Promise.prototype.disposable = function (disposer) {
            return this.then(function (resource) {
                return {
                    resource: resource,
                    dispose: disposer
                };
            });
        };
        /**
         * Like `then` with only an `onfulfilled` handler, but will relay the
         * previous fulfilled value instead of value returned by its own
         * `onfulfilled` handler.
         * @param onfulfilled Fulfillment handler.
         * @returns Created promise.
         */
        Promise.prototype.tap = function (onfulfilled) {
            var relayT;
            return this
                .then(function (value) {
                relayT = value;
                return onfulfilled(value);
            })
                .then(function () { return relayT; });
        };
        /**
         * Spread a fulfilled array-like value as arguments of the given handler.
         * @param onfulfilled Handler that takes the spread arguments.
         * @returns Created promise.
         */
        Promise.prototype.spread = function (onfulfilled) {
            return this.then(function (value) { return onfulfilled.apply(undefined, value); });
        };
        /**
         * A shortcut of `promise.then(undefined, onrejected)`.
         */
        Promise.prototype.fail = function (onrejected) {
            return this.then(undefined, onrejected);
        };
        Promise.prototype.catch = function (ReasonType, onrejected) {
            if (typeof onrejected === 'function') {
                return this.then(undefined, function (reason) {
                    if (reason instanceof ReasonType) {
                        return onrejected(reason);
                    }
                    else {
                        throw reason;
                    }
                });
            }
            else {
                onrejected = ReasonType;
                return this.then(undefined, onrejected);
            }
        };
        /**
         * A shortcut of `Promise.map`, assuming the fulfilled value of
         * previous promise is a array.
         * @param callback Map callback.
         * @returns Created promise.
         */
        Promise.prototype.map = function (callback) {
            return this.then(function (values) { return Promise.map(values, callback); });
        };
        /**
         * A shortcut of `Promise.each`, assuming the fulfilled value of
         * previous promise is a array.
         * @param callback Each callback.
         * @returns Created promise.
         */
        Promise.prototype.each = function (callback) {
            return this.then(function (values) { return Promise.each(values, callback); });
        };
        /**
         * A shortcut of `Promise.waterfall`, take the fulfilled value of
         * previous promise as initial result.
         */
        Promise.prototype.waterfall = function (values, callback) {
            return this.then(function (initialResult) { return Promise.waterfall(values, initialResult, callback); });
        };
        Promise.prototype.retry = function (options, callback) {
            return this.then(function () { return Promise.retry(options, callback); });
        };
        /**
         * Log the value specified on fulfillment, or if not, the fulfilled value or
         * rejection reason of current promise after the previous promise becomes settled.
         * @param object Specified value to log.
         * @returns Created promise.
         */
        Promise.prototype.log = function (object) {
            if (object === undefined) {
                return this.then(function (value) {
                    if (value !== undefined) {
                        console.log(value);
                    }
                    return value;
                }, function (reason) {
                    console.error(reason && (reason.stack || reason.message) || reason);
                    return undefined;
                });
            }
            else {
                return this.tap(function () {
                    console.log(object);
                });
            }
        };
        /**
         * Call `this.then` with `onrejected` handler only, and throw the
         * rejection reason if any.
         */
        Promise.prototype.done = function () {
            this.then(undefined, function (reason) {
                utils_1.asap(function () {
                    throw reason;
                });
            });
        };
        Object.defineProperty(Promise.prototype, "break", {
            /**
             * (get) A promise that will be rejected with a pre-break signal if previous
             * promise is fulfilled with a non-`false` value.
             */
            get: function () {
                return this.then(function (value) {
                    if (value !== false) {
                        throw PRE_BREAK_SIGNAL;
                    }
                });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "void", {
            /**
             * (get) A promise that will eventually be fulfilled with `undefined`.
             */
            get: function () {
                return this.then(function () { return undefined; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "true", {
            /**
             * (get) A promise that will eventually been fulfilled with `true`.
             */
            get: function () {
                return this.then(function () { return true; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "false", {
            /**
             * (get) A promise that will eventually been fulfilled with `false`.
             */
            get: function () {
                return this.then(function () { return false; });
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "context", {
            /**
             * (get) Get the context of current promise.
             */
            get: function () {
                return this._context;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "pending", {
            /**
             * (get) A boolean that indicates whether the promise is pending.
             */
            get: function () {
                return this._state === 0 /* pending */;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "fulfilled", {
            /**
             * (get) A boolean that indicates whether the promise is fulfilled.
             */
            get: function () {
                return this._state === 1 /* fulfilled */;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "rejected", {
            /**
             * (get) A boolean that indicates whether the promise is rejected.
             */
            get: function () {
                return this._state === 2 /* rejected */;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise.prototype, "interrupted", {
            /**
             * (get) A boolean that indicates whether the promise is interrupted.
             */
            get: function () {
                return this._state === 3 /* interrupted */;
            },
            enumerable: true,
            configurable: true
        });
        // Static helpers
        /**
         * A shortcut of `Promise.void.then(onfulfilled)`.
         * @param onfulfilled Fulfillment handler.
         * @returns Created promise.
         */
        Promise.then = function (onfulfilled) {
            return Promise.void.then(onfulfilled);
        };
        Promise.resolve = function (resolvable) {
            if (resolvable instanceof Promise) {
                return resolvable;
            }
            else {
                var promise = new Promise();
                promise.resolve(resolvable);
                return promise;
            }
        };
        Promise.reject = function (reason) {
            var promise = new Promise();
            promise.reject(reason);
            return promise;
        };
        /**
         * Alias of `Promise.resolve`.
         */
        Promise.when = function (value) {
            return Promise.resolve(value);
        };
        /**
         * Create a promise with given context.
         * @param context Promise context.
         * @returns Created promise.
         */
        Promise.context = function (context) {
            var promise = new Promise(context);
            promise.resolve();
            return promise;
        };
        /**
         * Create a promise that will be fulfilled with `undefined` in given
         * time.
         * @param timeout Timeout in milliseconds.
         * @returns Created promise.
         */
        Promise.delay = function (timeout) {
            return new Promise(function (resolve) {
                setTimeout(function () { return resolve(); }, Math.floor(timeout) || 0);
            });
        };
        /**
         * Create a promise that will be fulfilled:
         *
         *   1. when all values are fulfilled.
         *   2. with the value of an array of fulfilled values.
         *
         * And will be rejected:
         *
         *   1. if any of the values is rejected.
         *   2. with the reason of the first rejection as its reason.
         *   3. after all values are either fulfilled or rejected.
         *
         * @param resolvables Resolvables involved.
         * @returns Created promise.
         */
        Promise.all = function (resolvables) {
            if (!resolvables.length) {
                return Promise.resolve([]);
            }
            var resultsPromise = new Promise();
            var results = [];
            var remaining = resolvables.length;
            var reasons = [];
            resolvables.forEach(function (resolvable, index) {
                Promise
                    .resolve(resolvable)
                    .then(function (result) {
                    results[index] = result;
                    checkCompletion();
                }, function (reason) {
                    reasons.push(reason);
                    checkCompletion();
                });
            });
            function checkCompletion() {
                remaining--;
                if (!remaining) {
                    if (reasons.length) {
                        resultsPromise.reject(reasons[0]);
                    }
                    else {
                        resultsPromise.resolve(results);
                    }
                }
            }
            return resultsPromise;
        };
        /**
         * Create a promise that is settled the same way as the first passed promise to settle.
         * It resolves or rejects, whichever happens first.
         * @param resolvables Promises or values to race.
         * @returns Created promise.
         */
        Promise.race = function (resolvables) {
            var promise = new Promise();
            for (var _i = 0; _i < resolvables.length; _i++) {
                var resolvable = resolvables[_i];
                Promise
                    .resolve(resolvable)
                    .handle(promise);
            }
            return promise;
        };
        /**
         * A promise version of `Array.prototype.map`.
         * @param values Values to map.
         * @param callback Map callback.
         * @returns Created promise.
         */
        Promise.map = function (values, callback) {
            return Promise.all(values.map(callback));
        };
        /**
         * (breakable) Iterate elements in an array one by one.
         * TResult `false` or a promise that will eventually be fulfilled with
         * `false` to interrupt iteration.
         * @param values Values to iterate.
         * @param callback Each callback.
         * @returns A promise that will be fulfiled with a boolean which
         *     indicates whether the iteration completed without interruption.
         */
        Promise.each = function (values, callback) {
            return values
                .reduce(function (promise, value, index, values) {
                return promise.then(function (result) {
                    if (result === false) {
                        throw BREAK_SIGNAL;
                    }
                    return callback(value, index, values);
                });
            }, Promise.resolve(undefined))
                .then(function () { return true; })
                .enclose()
                .then(function (completed) { return !!completed; });
        };
        /**
         * (breakable) Pass the last result to the same callback with pre-set values.
         * @param values Pre-set values that will be passed to the callback one
         *     by one.
         * @param initialResult The initial result for the very first call.
         * @param callback Waterfall callback.
         */
        Promise.waterfall = function (values, initialResult, callback) {
            var lastResult = initialResult;
            return Promise
                .each(values, function (value, index, array) {
                var callbackPromise = Promise
                    .then(function () { return callback(value, lastResult, index, array); })
                    .then(function (result) { return result; });
                return callbackPromise
                    .enclose()
                    .then(function (result) {
                    if (callbackPromise.interrupted) {
                        return false;
                    }
                    else {
                        lastResult = result;
                    }
                });
            })
                .then(function () { return lastResult; });
        };
        Promise.retry = function (options, callback) {
            if (options === void 0) { options = {}; }
            if (callback === undefined &&
                typeof options === 'function') {
                callback = options;
                options = {};
            }
            var _a = options.limit, limit = _a === void 0 ? 3 : _a, _b = options.interval, interval = _b === void 0 ? 0 : _b;
            var lastReason;
            var attemptIndex = 0;
            return process();
            function process() {
                return Promise
                    .then(function () { return callback(lastReason, attemptIndex++); })
                    .enclose()
                    .fail(function (reason) {
                    if (attemptIndex >= limit) {
                        throw reason;
                    }
                    lastReason = reason;
                    if (interval) {
                        return Promise
                            .delay(interval)
                            .then(function () { return process(); });
                    }
                    else {
                        return process();
                    }
                });
            }
        };
        /**
         * Use a disposable resource and dispose it after been used.
         * @param disposable The disposable resource or a thenable of
         *     disposable resource.
         * @param handler Using handler.
         * @returns Created promise.
         */
        Promise.using = function (disposable, handler) {
            var resolvedDisposable;
            var promise = Promise
                .when(disposable)
                .then(function (disposable) {
                resolvedDisposable = disposable;
                return handler(disposable.resource);
            });
            var disposed = false;
            function dispose() {
                if (!disposed) {
                    // Change the value of `disposed` first to avoid exception in
                    // `resolvedDisposable.dispose()` causing `onrejected` handler been called
                    // again.
                    disposed = true;
                    resolvedDisposable.dispose(resolvedDisposable.resource);
                }
            }
            promise
                .interruption(dispose)
                .then(dispose, dispose);
            return promise;
        };
        /**
         * Invoke a Node style asynchronous function that accepts the last
         * argument as callback.
         * @param fn Node style asynchronous function.
         * @param args Arguments.
         * @returns Created promise.
         */
        Promise.invoke = function (fn) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            return new Promise(function (resolve, reject) {
                args = args.concat(function (error, value) {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(value);
                    }
                });
                fn.apply(undefined, args);
            });
        };
        Object.defineProperty(Promise, "break", {
            /**
             * (fake statement) This getter will always throw a break signal that interrupts the promises chain.
             *
             * Example:
             *
             * ```ts
             * promise
             *     .then(() => {
             *         if (toBreak) {
             *             Promise.break;
             *         }
             *
             *         // Or not to break.
             *     })
             *     .then(() => {
             *         // If `toBreak` is true, it will never enter this handler.
             *     }, () => {
             *         // Nor this handler.
             *     });
             * ```
             */
            get: function () {
                throw BREAK_SIGNAL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise, "breakSignal", {
            /** (get) The break signal. */
            get: function () {
                return BREAK_SIGNAL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise, "preBreakSignal", {
            /** (get) The pre-break signal. */
            get: function () {
                return PRE_BREAK_SIGNAL;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise, "void", {
            /**
             * (get) A promise that has already been fulfilled with `undefined`.
             */
            get: function () {
                var promise = new Promise();
                promise.resolve(undefined);
                return promise;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise, "true", {
            /**
             * (get) A promise that has already been fulfilled with `true`.
             */
            get: function () {
                var promise = new Promise();
                promise.resolve(true);
                return promise;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Promise, "false", {
            /**
             * (get) A promise that has already been fulfilled with `false`.
             */
            get: function () {
                var promise = new Promise();
                promise.resolve(false);
                return promise;
            },
            enumerable: true,
            configurable: true
        });
        return Promise;
    })();
    exports.Promise = Promise;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = Promise;
    /**
     * Promise lock is a useful helper that can act as a simple task queue.
     */
    var PromiseLock = (function () {
        function PromiseLock() {
            this._promise = Promise.void;
        }
        /**
         * handler will be called once this promise lock is unlocked, and it
         * will be locked again until the value returned by handler is
         * fulfilled.
         * @param handler Promise lock handler.
         * @returns Created promise, will be fulfilled once the return value of
         *     lock handler gets fulfilled.
         */
        PromiseLock.prototype.lock = function (handler) {
            var promise = this._promise.then(handler);
            this._promise = promise
                .fail(function (reason) { return undefined; })
                .void;
            return promise;
        };
        return PromiseLock;
    })();
    exports.PromiseLock = PromiseLock;
    exports.using = Promise.using;
    exports.invoke = Promise.invoke;
});
//# sourceMappingURL=thenfail.js.map