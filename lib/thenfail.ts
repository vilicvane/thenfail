/*
 * ThenFail v0.1
 * Just another Promise/A+ implementation
 * https://github.com/vilic/thenfail
 * 
 * By VILIC VANE <https://github.com/vilic>
 */

'use strict';

declare var setImmediate;

var si = typeof setImmediate == 'function' ?
    setImmediate : function (handler) {
        setTimeout(handler, 0);
    };

/**
 * promise statuses.
 */
enum Status {
    pending,
    fulfilled,
    rejected
}

/**
 * the instance of class ThenFail is the promise as well as the promise resolver.
 */
class ThenFail<T> implements ThenFail.IPromise<T> {
    /*
     * to make things simpler to understand, a ThenFail instance could be imagined as
     * a relay runner who can relay its "state" to several other runners following
     * steps below:
     * 1. "grasp" the "state" from the previous runner or something invisible.
     * 2. "run" and finish its task.
     * 3. "relay" its "state" to the next runner.
     */

    private _onfulfilled = null;
    private _onrejected = null;

    private _status = Status.pending;

    private _nexts: ThenFail<any>[] = [];
    private _valueOrReason;

    /**
     * grasp
     */
    private _grasp(status: Status, valueOrReason) {
        if (this._status != Status.pending) {
            return;
        }

        var handler;

        switch (status) {
            case Status.fulfilled:
                status = Status.fulfilled;
                handler = this._onfulfilled;
                break;
            case Status.rejected:
                status = Status.rejected;
                handler = this._onrejected;
                break;
        }

        if (handler) {
            this._run(handler, valueOrReason);
        } else {
            this._relay(status, valueOrReason);
        }
    }

    /**
     * run
     */
    private _run(handler, valueOrReason) {
        si(() => {
            var ret;

            try {
                ret = handler(valueOrReason);
            } catch (e) {
                this._relay(Status.rejected, e);
                return;
            }

            ThenFail._unpack(this, ret, (status, valueOrReason) => {
                this._relay(status, valueOrReason);
            });
        });
    }

    /**
     * unpack (resolve)
     */
    private static _unpack(thisArg, value, callback: (status: Status, valueOrReason) => void) {
        if (value == thisArg) {
            callback(Status.rejected, new TypeError('the promise should not return itself'));
        } else if (value instanceof ThenFail) {
            if (value._status == Status.pending) {
                value
                    .then(value => {
                        callback(Status.fulfilled, value);
                    }, reason => {
                        callback(Status.rejected, reason);
                    });
            } else {
                callback(value._status, value._valueOrReason);
            }
        } else if (value) { // in case of null
            switch (typeof value) {
                case 'object':
                case 'function':
                    // ret is thenable

                    var then;
                    try {
                        then = value.then;
                    } catch (e) {
                        callback(Status.rejected, e);
                        break;
                    }

                    if (typeof then == 'function') {
                        var called = false;
                        try {
                            then
                                .call(value, value => {
                                    if (!called) {
                                        ThenFail._unpack(this, value, callback);
                                        called = true;
                                    }
                                }, reason => {
                                    if (!called) {
                                        callback(Status.rejected, reason);
                                        called = true;
                                    }
                                });
                        } catch (e) {
                            if (!called) {
                                callback(Status.rejected, e);
                                called = true;
                            }
                        }
                        break;
                    }
                default:
                    callback(Status.fulfilled, value);
                    break;
            }
        } else {
            callback(Status.fulfilled, value);
        }
    }

    /**
     * relay
     */
    private _relay(status: Status, valueOrReason) {
        if (this._status != Status.pending) {
            return;
        }

        this._status = status;
        this._valueOrReason = valueOrReason;
        this._nexts.forEach((next) => {
            next._grasp(status, valueOrReason);
        });

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
    resolve(value) {
        ThenFail._unpack(this, value, (status, valueOrReason) => {
            this._grasp(status, valueOrReason);
        });
    }

    /**
     * reject this promise.
     * @param reason the reason to reject this promise with.
     */
    reject(reason) {
        this._grasp(Status.rejected, reason);
    }

    /**
     * create a new ThenFail promise instance by wrapping up given value or thenable
     * if it not a ThenFail promise yet.
     */
    constructor(value: ThenFail<T>);
    /**
     * create a new ThenFail promise instance by wrapping up given value or thenable
     * if it not a ThenFail promise yet.
     */
    constructor(value: ThenFail.IPromise<T>);
    /**
     * create a new ThenFail promise instance by wrapping up given value or thenable
     * if it not a ThenFail promise yet.
     */
    constructor(value: T);
    /**
     * create a new pending ThenFail promise instance.
     */
    constructor();
    /**
     * create a new ThenFail promise instance by wrapping up given value or thenable
     * if it not a ThenFail promise yet, or create a pending ThenFail promise if no
     * value is given.
     */
    constructor(value?: any) {
        if (arguments.length) {
            if (value instanceof ThenFail) {
                return value;
            }

            ThenFail._unpack({}, value, (status, valueOrReason) => {
                this._grasp(status, valueOrReason);
            });
        }
    }
    
    /**
     * then method following Promise/A+ specification.
     */
    then<R>(onfulfilled?: void, onrejected?: void): ThenFail<T>;
    /**
     * then method following Promise/A+ specification.
     */
    then<R>(onfulfilled: void, onrejected: (reason) => any): ThenFail<T>;
    /**
     * then method following Promise/A+ specification.
     */
    then<R>(onfulfilled: (value: T) => ThenFail<R>, onrejected?: (reason) => any): ThenFail<R>;
    /**
     * then method following Promise/A+ specification.
     */
    then<R>(onfulfilled: (value: T) => ThenFail.IPromise<R>, onrejected?: (reason) => any): ThenFail<R>;
    /**
     * then method following Promise/A+ specification.
     */
    then<R>(onfulfilled: (value: T) => R, onrejected?: (reason) => any): ThenFail<R>;
    /**
     * then method following Promise/A+ specification.
     */
    then(onfulfilled?, onrejected?) {
        var promise = new ThenFail<any>();

        if (typeof onfulfilled == 'function') {
            promise._onfulfilled = onfulfilled;
        }
        if (typeof onrejected == 'function') {
            promise._onrejected = onrejected;
        }

        if (this._status == Status.pending) {
            this._nexts.push(promise);
        } else {
            promise._grasp(this._status, this._valueOrReason);
        }

        return promise;
    }


    // HELPERS

    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    fail(onrejected: (reason) => ThenFail.IPromise<T>): ThenFail<T>;
    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    fail(onrejected: (reason) => T): ThenFail<T>;
    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    fail(onrejected: (reason) => any) {
        return this.then(null, onrejected);
    }

    /**
     * a helper that delays the relaying of fulfilled value from previous promise.
     * @param interval delay interval (milliseconds).
     */
    delay(interval: number) {
        return this.then(value => {
            var promise = new ThenFail<T>();

            setTimeout(() => {
                promise.resolve(value);
            }, Math.floor(interval) || 0);

            return promise;
        });
    }


    // STATIC

    private static _first = new ThenFail<void>(null);

    /**
     * a static then shortcut for a promise already fulfilled with value null.
     */
    static then<R>(onfulfilled: (value: void) => ThenFail<R>): ThenFail<R>;
    /**
     * a static then shortcut for a promise already fulfilled with value null.
     */
    static then<R>(onfulfilled: (value: void) => ThenFail.IPromise<R>): ThenFail<R>;
    /**
     * a static then shortcut for a promise already fulfilled with value null.
     */
    static then<R>(onfulfilled: (value: void) => R): ThenFail<R>;
    /**
     * a static then shortcut for a promise already fulfilled with value null.
     */
    static then(onfulfilled) {
        return ThenFail._first.then(onfulfilled);
    }
    
    /**
     * a static delay shortcut for a promise already fulfilled with value null.
     */
    static delay(interval: number): ThenFail<void> {
        return ThenFail._first.delay(interval);
    }

    /**
     * create a promise that will be fulfilled after all promises (or values) are fulfilled,
     * and will be rejected after at least one promise (or value) is rejected and the others
     * are fulfilled.
     */
    static all<R>(promises: ThenFail<R>[]): ThenFail<R[]>;
    /**
     * create a promise that will be fulfilled after all promises (or values) are fulfilled,
     * and will be rejected after at least one promise (or value) is rejected and the others
     * are fulfilled.
     */
    static all<R>(promises: ThenFail.IPromise<R>[]): ThenFail<R[]>;
    /**
     * create a promise that will be fulfilled after all promises (or values) are fulfilled,
     * and will be rejected after at least one promise (or value) is rejected and the others
     * are fulfilled.
     */
    static all<R>(promises: R[]): ThenFail<R[]>;
    /**
     * create a promise that will be fulfilled after all promises (or values) are fulfilled,
     * and will be rejected after at least one promise (or value) is rejected and the others
     * are fulfilled.
     */
    static all(promises: any[]) {
        var allPromise = new ThenFail<any[]>();
        var values = Array(promises.length);

        var rejected = false;
        var rejectedReason;

        var remain = promises.length;

        promises.forEach((promise, i) => {
            ThenFail._unpack({}, promise, (status, valueOrReason) => {
                if (status == Status.fulfilled) {
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
                    allPromise._grasp(Status.rejected, rejectedReason);
                } else {
                    allPromise._grasp(Status.fulfilled, values);
                }
            }
        }

        return allPromise;
    }
}

module ThenFail {
    /**
     * alias for ThenFail.
     */
    export var Promise = ThenFail;

    /**
     * for general promise implementations.
     */
    export interface IPromise<T> {
        then: IPromiseThen<T>;
    }

    export interface IPromiseThen<T> {
        <R>(onfulfilled?: void, onrejected?: void): IPromise<T>;
        <R>(onfulfilled: void, onrejected: (reason) => any): IPromise<T>;
        <R>(onfulfilled: (value: T) => IPromise<R>, onrejected?: (reason) => any): IPromise<R>;
        <R>(onfulfilled: (value: T) => R, onrejected?: (reason) => any): IPromise<R>;
    }
}

export = ThenFail;

