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

declare var self: Window;
declare var global: Window;

if (typeof self === 'undefined') {
    global.self = global;
}

(<any>self)._thenfailCaptureStartLine = () => ThenFail.Utils.captureLine();

/**
 * the instance of class ThenFail is the promise as well as the promise resolver.
 */
class ThenFail<T> implements ThenFail.Thenable<T> {
    /*
     * to make things simpler to understand, a ThenFail instance could be imagined as
     * a relay runner who can relay its "state" to several other runners following
     * steps below:
     * 1. "grab" the "state" from the previous runner or something invisible.
     * 2. "run" and finish its task.
     * 3. "relay" its "state" to the next runner.
     */

    private _onfulfilled: (value: T) => any;
    private _onrejected: (reason: any) => any;
    private _onavailassertion: () => boolean;

    private _markTime = false;
    private _hasNexts = false;
    private _nexts: ThenFail<any>[] = [];
    private _baton: ThenFail.IBaton<T> = {
        state: ThenFail.State.pending
    };

    private _stack: string;
    private _previous: ThenFail<any>;

    /**
     * create a ThenFail promise instance.
     */
    constructor(handler: (resolve: (value?: ThenFail.Thenable<T>|T) => void, reject: (reason: any) => void) => void);
    constructor(value: ThenFail.Thenable<T>|T);
    constructor();
    constructor(value?: any) {
        if (arguments.length) {
            if (value instanceof ThenFail) {
                return value;
            }

            if (typeof value === 'function') {
                try {
                    value((value: any) => {
                        this.resolve(value);
                    }, (reason: any) => {
                        this.reject(reason);
                    });
                } catch (e) {
                    this.reject(e);
                }
            } else {
                ThenFail._unpack({}, value, (baton, previous) => {
                    this._grab(baton, previous);
                });
            }
        }

        if (ThenFail.longStackTrace) {
            try {
                throw new Error();
            } catch (e) {
                this._stack = ThenFail.Utils.filterStackString(e.stack.substr(e.stack.indexOf('\n') + 1));
            }
        }
    }

    /**
     * grab
     */
    private _grab(baton: ThenFail.IBaton<T>, previous: ThenFail<any>) {
        if (this._baton.state != ThenFail.State.pending) {
            return;
        }

        if (ThenFail.longStackTrace) {
            this._previous = previous;
        }

        if (this._markTime) {
            baton.time = Date.now();
        }

        var handler: (arg: any) => any;

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
        } else {
            if (typeof this._onavailassertion === 'function' && !this._onavailassertion.call(null)) {
                return;
            }

            this._relay(baton);
        }
    }

    /**
     * run
     */
    private _run(handler: (valueOrReason: any) => any, baton?: ThenFail.IBaton<T>) {
        ThenFail.Utils.nextTick(() => {
            var ret: any;

            if (typeof this._onavailassertion === 'function' && !this._onavailassertion.call(null)) {
                return;
            }

            var time = baton.time;

            try {
                if (baton.state == ThenFail.State.fulfilled) {
                    ret = handler(baton.value);
                } else {
                    ret = handler(baton.reason);
                }
            } catch (e) {
                if (ThenFail.longStackTrace) {
                    ThenFail._makeStackTraceLong(e, this);
                }

                this._relay({
                    state: ThenFail.State.rejected,
                    reason: e,
                    time: baton.time
                });

                return;
            }

            ThenFail._unpack(this, ret, (baton, previous) => {
                baton.time = time;
                this._relay(baton, previous);
            });
        });
    }

    /**
     * unpack (resolve)
     */
    private static _unpack(thisArg: any, value: any, callback: (baton: ThenFail.IBaton<any>, previous: ThenFail<any>) => void) {
        if (value == thisArg) {
            callback({
                state: ThenFail.State.rejected,
                reason: new TypeError('the promise should not return itself')
            }, null);
        } else if (value instanceof ThenFail) {
            if (ThenFail.longStackTrace && thisArg instanceof ThenFail) {
                thisArg._previous = value;
            }

            var promise = <ThenFail<any>>value;
            var baton = promise._baton;

            if (baton.state == ThenFail.State.pending) {
                value
                    .then((fulfilledValue: any) => {
                        callback({
                            state: ThenFail.State.fulfilled,
                            value: fulfilledValue
                        }, null);
                    }, (reason: any) => {
                        callback({
                            state: ThenFail.State.rejected,
                            reason: reason
                        }, null);
                    });
            } else {
                callback(baton, promise);
            }
        } else if (value) { // in case of null
            switch (typeof value) {
                case 'object':
                case 'function':
                    // ret is thenable
                    var then: any;
                    try {
                        then = value.then;
                    } catch (e) {
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
                                .call(value, (value: any) => {
                                    if (!called) {
                                        called = true;
                                        ThenFail._unpack(this, value, callback);
                                    }
                                }, (reason: any) => {
                                    if (!called) {
                                        called = true;
                                        callback({
                                            state: ThenFail.State.rejected,
                                            reason: reason
                                        }, null);
                                    }
                                });
                        } catch (e) {
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
        } else {
            callback({
                state: ThenFail.State.fulfilled,
                value: value
            }, null);
        }
    }

    /**
     * relay
     */
    private _relay(baton: ThenFail.IBaton<T>, previous?: ThenFail<any>) {
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
            this._nexts.forEach(next => {
                next._grab(baton, previous || this);
            });

            if (
                ThenFail.logRejectionsNotRelayed &&
                baton.state == ThenFail.State.rejected &&
                !this._hasNexts
                ) {
                ThenFail.Utils.nextTick(() => {
                    if (!this._hasNexts) {
                        ThenFail.Options.Log.errorLogger(
                            'A rejection has not been relayed occurs, you may want to add .done() or .log() to the end of every promise.',
                            baton.reason,
                            'Turn off this message by setting ThenFail.logRejectionsNotRelayed to false.'
                        );
                    }
                });
            }
        } else if (baton.state == ThenFail.State.rejected) {
            ThenFail.Utils.nextTick(() => {
                throw baton.reason;
            });
        }

        this._relax();
    }

    /**
     * relax
     */
    private _relax() {
        this._onfulfilled = null;
        this._onrejected = null;
        this._nexts = null;
    }

    /**
     * resolve this promise.
     * @param value the value to resolve this promise with, could be a promise.
     */
    resolve(value?: ThenFail.Thenable<T>|T): void;
    resolve(value?: any): void {
        ThenFail._unpack(this, value, (baton, previous) => {
            this._grab(baton, previous);
        });
    }

    /**
     * reject this promise.
     * @param reason the reason to reject this promise with.
     */
    reject(reason: any) {
        this._grab({
            state: ThenFail.State.rejected,
            reason: reason
        }, null);
    }

    /**
     * then method following Promises/A+ specification.
     */
    then(onfulfilled?: void, onrejected?: void): ThenFail<T>;
    then(onfulfilled: void, onrejected: (reason: any) => any): ThenFail<T>;
    then<R>(onfulfilled: (value: T) => ThenFail.Thenable<R>|R, onrejected?: (reason: any) => any): ThenFail<R>;
    then(onfulfilled?: any, onrejected?: any): ThenFail<any> {
        var promise = new ThenFail<any>();

        promise._onavailassertion = this._onavailassertion;

        if (typeof onfulfilled === 'function') {
            promise._onfulfilled = onfulfilled;
        }
        if (typeof onrejected === 'function') {
            promise._onrejected = onrejected;
        }

        if (this._baton.state == ThenFail.State.pending) {
            this._nexts.push(promise);
        } else {
            promise._grab(this._baton, this);
        }

        if (!this._hasNexts) {
            this._hasNexts = true;
        }

        return promise;
    }

    /**
     * add an invisible promise with no nexts to the chain, error will be thrown if it's relayed to this promise (i.e. not handled by parent promises).
     */
    done() {
        var donePromise = this.then();
        donePromise._nexts = null;
    }

    /**
     * add an assertion to the promises chain, if it returns false, the active promises in this chain will stop relaying on.
     * returns the current promise.
     */
    avail(assertion: () => boolean): ThenFail<T> {
        this._onavailassertion = assertion;
        return this;
    }

    /**
     * mark start time, see also `timeEnd`.
     */
    time(): ThenFail<T> {
        this._markTime = true;
        if (!this.pending) {
            this._baton.time = Date.now();
        }
        return this;
    }

    /**
     * a string contains "{duration}" that will be replaced as the calculated value.
     */
    timeEnd(message = '{duration}'): ThenFail<T> {
        this.then(() => {
            var now = Date.now();
            var startTime = this._baton.time || now;
            message = message.replace('{duration}', now - startTime + 'ms');
            ThenFail.Options.Log.valueLogger(message);
        });

        return this;
    }

    /**
     * get a boolean indicates whether the state of this promise is `pending`.
     */
    get pending(): boolean {
        return this._baton.state == ThenFail.State.pending;
    }

    /**
     * get a boolean indicates whether the state of this promise is `fulfilled`.
     */
    get fulfilled(): boolean {
        return this._baton.state == ThenFail.State.fulfilled;
    }

    /**
     * get a boolean indicates whether the state of this promise is `rejected`.
     */
    get rejected(): boolean {
        return this._baton.state == ThenFail.State.rejected;
    }

    // HELPERS

    /**
     * log the fulfilled value or rejection, or specified value.
     */
    log(object?: any): ThenFail<void> {
        var hasObjectToLog = !!arguments.length;

        var promise = this
            .then(value => {
                if (hasObjectToLog) {
                    ThenFail.Options.Log.valueLogger(object);
                } else if (value !== undefined) {
                    ThenFail.Options.Log.valueLogger(value);
                }
            }, reason => {
                if (ThenFail.Options.Log.throwUnhandledRejection) {
                    throw reason;
                } else {
                    ThenFail.Options.Log.errorLogger(reason);
                }
            });

        promise.done();

        return promise;
    }

    /**
     * spread an array argument to arguments directly via `onfulfilled.apply(null, value)`.
     */
    spread<R>(onfulfilled: (...args: any[]) => ThenFail.Thenable<R>|R): ThenFail<R> {
        return this.then<R>((args: any) => {
            return onfulfilled.apply(null, args);
        });
    }

    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    fail(onrejected: (reason: any) => any): ThenFail<T> {
        return this.then<T>(null, onrejected);
    }

    /**
     * catch.
     */
    catch(onrejected: (reason: any) => any): ThenFail<T>;
    catch(ErrorType: Function, onrejected: (reason: any) => any): ThenFail<T>;
    catch(ErrorType: any, onrejected?: any): ThenFail<T> {
        if (typeof onrejected === 'function') {
            return this.then<T>(null, reason => {
                if (reason instanceof ErrorType) {
                    return onrejected(reason);
                } else {
                    throw reason;
                }
            });
        } else {
            onrejected = ErrorType;
            return this.then<T>(null, onrejected);
        }
    }

    /**
     * call `onalways` handler when its previous promise get fulfilled or rejected.
     */
    always<R>(onalways: (value: T, reason: any) => ThenFail.Thenable<R>|R): ThenFail<R> {
        return this
            .then(value => {
                return onalways(value, undefined);
            }, reason => {
                onalways(undefined, reason);
            });
    }

    /**
     * a helper that delays the relaying of fulfilled value from previous promise.
     * @param interval delay interval (milliseconds, default to 0).
     */
    delay(interval = 0): ThenFail<T> {
        return this.then(value => {
            var promise = new ThenFail<T>();

            setTimeout(() => {
                promise._grab({
                    state: ThenFail.State.fulfilled,
                    value: value
                }, this);
            }, Math.floor(interval) || 0);

            return promise;
        });
    }

    /**
     * retry doing something, will be rejected if the failures execeeds limits (defaults to 2).
     * you may either return a rejected promise or throw an error to produce a failure.
     */
    retry<R>(onfulfilled: (value: T) => ThenFail.Thenable<R>|R, options?: ThenFail.IRetryOptions): ThenFail<R> {
        options = ThenFail.Utils.defaults<ThenFail.IRetryOptions>(options, ThenFail.Options.Retry);

        return this.then(value => {
            var fulfilled = ThenFail.resolved(value);
            var retryPromise = new ThenFail<R>();

            var retry = (retriesLeft: number, lastReason?: any) => {
                if (lastReason && options.onretry) {
                    options.onretry(retriesLeft, lastReason);
                }

                fulfilled
                    .then<R>(value => {
                        return onfulfilled(value);
                    })
                    .then(value => {
                        retryPromise._grab({
                            state: ThenFail.State.fulfilled,
                            value: value
                        }, this);
                    })
                    .fail(reason => {
                        if (retriesLeft) {
                            retry(retriesLeft - 1);
                        } else {
                            retryPromise.reject(reason);
                        }
                    });
            };

            retry(options.limit);

            return retryPromise;
        });
    }

    /**
     * resolve current promise in given time (milliseconds) with optional value.
     * the timer starts immediately when this method is called.
     */
    timeout(time: number, value?: T): ThenFail<T> {
        setTimeout(() => {
            this.resolve(value);
        }, Math.floor(time));

        return this;
    }

    /**
     * relay the state of current promise to the promise given, and return current promise itself.
     */
    handle(promise: ThenFail<T>): ThenFail<T> {
        this
            .then(value => {
                promise._grab(this._baton, this._previous);
            }, reason => {
                promise._grab(this._baton, this._previous);
            });

        return this;
    }

    /**
     * get a promise that will be fulfilled with value `undefined` when its previous promise gets fulfilled.
     */
    get void(): ThenFail<void> {
        return this.then(() => { });
    }

    /**
     * get a promise that will be fulfilled with value `true` when its previous promise gets fulfilled.
     */
    get true(): ThenFail<boolean> {
        return this.then(() => true);
    }

    /**
     * get a promise that will be fulfilled with value `false` when its previous promise gets fulfilled.
     */
    get false(): ThenFail<boolean> {
        return this.then(() => false);
    }

    /**
     * get the nth element in the array returned.
     */
    first<T>(): ThenFail<T> {
        return this.then(values => (<any>values)[0]);
    }

    /**
     * get a promise that will be fulfilled with the value given when its previous promise gets fulfilled.
     */
    return<T>(value: T): ThenFail<T> {
        return this.then(() => value);
    }

    // STATIC

    /**
     * get a promise already fulfilled with value `undefined`.
     */
    static get void(): ThenFail<void> {
        return ThenFail.resolved<void>(undefined);
    }

    /**
     * get a promise already fulfilled with value `true`.
     */
    static get true(): ThenFail<boolean> {
        return ThenFail.resolved(true);
    }

    /**
     * get a promise already fulfilled with value `false`.
     */
    static get false(): ThenFail<boolean> {
        return ThenFail.resolved(false);
    }

    /**
     * a static then shortcut of a promise already fulfilled with value `undefined`.
     */
    static then<R>(onfulfilled: (value: void) => ThenFail.Thenable<R>|R): ThenFail<R> {
        return ThenFail.void.then(onfulfilled);
    }

    /**
     * a static avail shortcut of a promise already fulfilled with value `undefined`.
     */
    static avail(assertion: () => boolean): ThenFail<void> {
        return ThenFail.void.avail(assertion);
    }

    /**
     * a static time shortcut of a promise already fulfilled with value `undefined`.
     */
    static time(): ThenFail<void> {
        return ThenFail.void.time();
    }

    /**
     * a static delay shortcut of a promise already fulfilled with value `undefined`.
     */
    static delay(interval: number): ThenFail<void> {
        return ThenFail.void.delay(interval);
    }

    /**
     * create a promise that will be fulfilled after all promises (or values) get fulfilled,
     * and will be rejected after at least one promise (or value) gets rejected and the others get fulfilled.
     */
    static all<R>(promises: (ThenFail.Thenable<R>|R)[]): ThenFail<R[]> {
        var allPromise = new ThenFail<any>();
        var values = Array(promises.length);

        var rejected = false;
        var rejectedReason: any;

        var remain = promises.length;

        if (remain) {
            promises.forEach((promise, i) => {
                ThenFail._unpack({}, promise, baton => {
                    if (baton.state == ThenFail.State.fulfilled) {
                        values[i] = baton.value;
                    } else if (!rejected) {
                        rejected = true;
                        rejectedReason = baton.reason;
                    }

                    done();
                });
            });
        } else {
            done();
        }

        function done() {
            if (--remain <= 0) {
                if (rejected) {
                    allPromise._grab({
                        state: ThenFail.State.rejected,
                        reason: rejectedReason
                    }, null);
                } else {
                    allPromise._grab({
                        state: ThenFail.State.fulfilled,
                        value: values
                    }, null);
                }
            }
        }

        return allPromise;
    }

    /**
     * a static retry shortcut of a promise already fulfilled with value `undefined`.
     */
    static retry<R>(onfulfilled: (value: void) => ThenFail.Thenable<R>|R, options?: ThenFail.IRetryOptions): ThenFail<R> {
        return this.void.retry(onfulfilled, options);
    }

    /**
     * transverse an array, if the return value of handler is a promise, it will wait till the promise gets fulfilled. return `false` in the handler to interrupt the transversing.
     * this method returns a promise that will be fulfilled with a boolean, `true` indicates that it completes without interruption, otherwise `false`.
     */
    static each<T>(items: T[], handler: (item: T, index: number) => ThenFail.Thenable<any>|boolean|void): ThenFail<boolean> {
        if (!items) {
            return ThenFail.true;
        }

        var ret = new ThenFail<boolean>();

        next(0);

        function next(index: number) {
            if (index >= items.length) {
                ret.resolve(true);
                return;
            }

            var item = items[index];

            ThenFail
                .then(() => {
                    return handler(item, index);
                })
                .then(result => {
                    if (result === false) {
                        ret.resolve(false);
                    } else {
                        next(index + 1);
                    }
                })
                .fail(reason => {
                    ret.reject(reason);
                });
        }

        return ret;
    }

    /**
     * a promise version of `Array.prototype.map`.
     */
    static map<T, R>(items: T[], handler: (item: T, index: number) => ThenFail.Thenable<R>|R): ThenFail<R[]> {
        var mapped: R[] = [];

        if (!items) {
            return ThenFail.resolved(mapped);
        }

        var promises = items.map((item, i) => handler(item, i));

        return ThenFail.all(promises);
    }

    /**
     * create a promise resolved by given value.
     */
    static resolved<T>(value: ThenFail.Thenable<T>|T): ThenFail<T> {
        var promise = new ThenFail<T>();
        promise.resolve(value);
        return promise;
    }

    /**
     * create a promise already rejected by given reason.
     */
    static rejected(reason: any): ThenFail<any>;
    static rejected<T>(reason: any): ThenFail<T>;
    static rejected(reason: any): ThenFail<any> {
        var promise = new ThenFail<any>();
        promise.reject(reason);
        return promise;
    }


    // NODE HELPER

    /**
     * invoke a node style async method.
     */
    static invoke<T>(object: Object, method: string, ...args: any[]): ThenFail<T> {
        var promise = new ThenFail<T>();

        try {
            (<any>object)[method].apply(object, args.concat((err: any, ret: any) => {
                if (err) {
                    promise.reject(err);
                } else {
                    promise.resolve(ret);
                }
            }));
        } catch (e) {
            promise.reject(e);
        }

        return promise;
    }

    /**
     * call a node style async function.
     */
    static call<T>(fn: Function, ...args: any[]): ThenFail<T> {
        var promise = new ThenFail<T>();

        try {
            fn.apply(null, args.concat((err: any, ret: any) => {
                if (err) {
                    promise.reject(err);
                } else {
                    promise.resolve(ret);
                }
            }));
        } catch (e) {
            promise.reject(e);
        }

        return promise;
    }

    // OTHERS

    private static _makeStackTraceLong(error: any, promise: ThenFail<any>) {
        var STACK_JUMP_SEPARATOR = 'From previous event:';

        if (promise._stack &&
            error && error.stack &&
            error.stack.indexOf(STACK_JUMP_SEPARATOR) < 0
            ) {

            var stacks = [ThenFail.Utils.filterStackString(error.stack)];

            for (var p = promise; p; p = p._previous) {
                if (p._stack) {
                    stacks.push(p._stack);
                }
            }

            var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
            error.stack = concatedStacks;
        }
    }
}

module ThenFail {
    /**
     * log rejections not been relayed.
     */
    export var logRejectionsNotRelayed = true;

    /**
     * chain the stack trace for debugging reason.
     * this has serious performance impact, never use in production.
     */
    export var longStackTrace = false;

    /**
     * promise states.
     */
    export enum State {
        pending,
        fulfilled,
        rejected
    }

    /**
     * baton used to be relayed among promises.
     */
    export interface IBaton<T> {
        state: State;
        value?: T;
        reason?: any;
        time?: number;
    }

    /**
     * alias for ThenFail.
     */
    export var Promise = ThenFail;

    /**
     * for general promise implementations.
     */
    export interface Thenable<T> {
        then<R>(onfulfilled: (value: T) => Thenable<R>|R, onrejected?: (reason: any) => any): Thenable<R>;
    }

    /**
     * A small helper class to queue async operations.
     */
    export class PromiseLock {
        private _promise = ThenFail.void;

        /**
         * handler will be called once this promise lock is unlocked, and it will be locked again until the promise returned by handler get fulfilled.
         */
        lock<T>(handler: () => Thenable<T>|T, unlockOnRejection = true): ThenFail<T> {
            var promise = this._promise.then(handler);
            this._promise = promise
                .fail(reason => {
                    if (!unlockOnRejection) {
                        throw reason;
                    } else {
                        promise.log();
                    }
                })
                .void;
            return promise;
        }

        /**
         * handler will be called once this promise lock is unlocked, but unlike `lock` method, `ready` will not lock it again.
         */
        ready(): ThenFail<void>;
        ready<T>(handler: () => Thenable<T>|T): ThenFail<T>;
        ready<T>(handler?: () => Thenable<T>|T): ThenFail<T|void> {
            return this._promise.then(handler);
        }
    }

    /**
     * default settings
     */
    export module Options {
        /**
         * default settings for retry
         */
        export module Retry {
            // number of times to retry, defaults to 2.
            export var limit = 2;
            // interval (milliseconds) between every retry, defaults to 0.
            export var interval = 0;
            // max interval (milliseconds) for retry if interval multiplier is applied, defaults to Infinity.
            export var maxInterval = Infinity;
            // the multiplier that will be applied to the interval each time after retry, defaults to 1.
            export var intervalMultiplier = 1;
            // a handler that will be triggered when retries happens.
            export var onretry: any = null;
        }

        /**
         * `log()` settings
         */
        export module Log {
            /**
             * whether to throw unhandled rejection when using `log()`.
             */
            export var throwUnhandledRejection = false;
            /**
             * value logger for `log()`.
             */
            export var valueLogger = (...values: any[]) => {
                values.forEach(value => {
                    if (value instanceof Object) {
                        console.log(JSON.stringify(value, null, '    '));
                    } else {
                        console.log(value);
                    }
                });
            };
            /**
             * error logger for `log()`.
             */
            export var errorLogger = (...reasons: any[]) => {
                reasons.forEach(reason => {
                    if (reason instanceof Error) {
                        console.warn(reason.stack || reason);
                    } else if (reason instanceof Object) {
                        console.warn(JSON.stringify(reason, null, '    '));
                    } else {
                        console.warn(reason);
                    }
                });
            };
        }
    }

    /**
     * interface for retry options
     */
    export interface IRetryOptions {
        /**
         * number of times to retry, defaults to 2.
         */
        limit?: number;
        /**
         * interval (milliseconds) between every retry, defaults to 0.
         */
        interval?: number;
        /**
         * max interval (milliseconds) for retry if interval multiplier is applied, defaults to Infinity.
         */
        maxInterval?: number;
        /**
         * the multiplier that will be applied to the interval each time after retry, defaults to 1.
         */
        intervalMultiplier?: number;
        /**
         * a handler that will be triggered when retries happens.
         */
        onretry?: (retriesLeft: number, lastReason: any) => void;
    }

    export module Utils {
        /**
         * defaults helper
         */
        export function defaults<T>(options: T, defaultOptions: T) {
            var hop = Object.prototype.hasOwnProperty;
            var result = options || {};
            for (var name in defaultOptions) {
                if (hop.call(options, name)) {
                    (<any>result)[name] = (<any>options)[name];
                }
                else {
                    (<any>result)[name] = (<any>defaultOptions)[name];
                }
            }
            return result;
        }

        declare var process: any;
        declare var setImmediate: typeof window.setImmediate;

        interface INextTickTask {
            task?: () => void;
            domain?: any;
            next?: INextTickTask;
        }

        /**
         * from Q.
         */
        export var nextTick = (() => {
            // linked list of tasks (single, with head node)
            var head: INextTickTask = {};
            var tail = head;
            var flushing = false;
            var requestTick: () => void = null;
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
                    } catch (e) {
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
                        } else {
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

            var nextTick = (task: () => void) => {
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

            } else if (typeof setImmediate === 'function') {
                // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
                if (typeof window !== 'undefined') {
                    requestTick = setImmediate.bind(window, flush);
                } else {
                    requestTick = () => {
                        setImmediate(flush);
                    };
                }

            } else if (typeof MessageChannel !== 'undefined') {
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

            } else {
                // old browsers
                requestTick = function () {
                    setTimeout(flush, 0);
                };
            }

            return nextTick;
        })();

        var thenfailFileName: string;
        var thenfailStartLine: number;
        var thenfailEndLine: number;

        function getFileNameAndLineNumber(stackLine: string): any[] {
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

        function isNodeFrame(stackLine: string): boolean {
            return /\((?:module|node)\.js:/.test(stackLine);
        }

        function isInternalFrame(stackLine: string): boolean {
            var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

            if (!fileNameAndLineNumber) {
                return false;
            }

            var fileName = fileNameAndLineNumber[0];
            var lineNumber = fileNameAndLineNumber[1];

            return fileName == thenfailFileName && lineNumber >= thenfailStartLine && lineNumber <= thenfailEndLine;
        }

        export function filterStackString(stackString: string): string {
            var lines = stackString.split('\n');
            var desiredLines: string[] = [];
            for (var i = 0; i < lines.length; ++i) {
                var line = lines[i];

                if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
                    desiredLines.push(line);
                }
            }
            return desiredLines.join('\n');
        }

        export function captureLine(): number {
            try {
                throw new Error();
            } catch (e) {
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

        export function captureBoundaries(): void {
            thenfailStartLine = (<any>self)._thenfailCaptureStartLine();
            thenfailEndLine = (<any>self)._thenfailCaptureEndLine();

            delete (<any>self)._thenfailCaptureStartLine;
            delete (<any>self)._thenfailCaptureEndLine;
        }
    }
}

(<any>self)._thenfailCaptureEndLine = () => ThenFail.Utils.captureLine();

ThenFail.Utils.captureBoundaries();

//#if args.module
export = ThenFail;
//#end if
