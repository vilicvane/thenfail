/**
 * the instance of class ThenFail is the promise as well as the promise resolver.
 */
declare class ThenFail<T> implements ThenFail.Thenable<T> {
    private _onfulfilled;
    private _onrejected;
    private _onavailassertion;
    private _markTime;
    private _hasNexts;
    private _nexts;
    private _baton;
    private _stack;
    private _previous;
    /**
     * create a ThenFail promise instance.
     */
    constructor(handler: (resolve: (value?: ThenFail.Thenable<T> | T) => void, reject: (reason: any) => void) => void);
    constructor(value: ThenFail.Thenable<T> | T);
    constructor();
    /**
     * grab
     */
    private _grab(baton, previous);
    /**
     * run
     */
    private _run(handler, baton?);
    /**
     * unpack (resolve)
     */
    private static _unpack(thisArg, value, callback);
    /**
     * relay
     */
    private _relay(baton, previous?);
    /**
     * relax
     */
    private _relax();
    /**
     * resolve this promise.
     * @param value the value to resolve this promise with, could be a promise.
     */
    resolve(value?: ThenFail.Thenable<T> | T): void;
    /**
     * reject this promise.
     * @param reason the reason to reject this promise with.
     */
    reject(reason: any): void;
    /**
     * then method following Promises/A+ specification.
     */
    then(onfulfilled?: void, onrejected?: void): ThenFail<T>;
    then(onfulfilled: void, onrejected: (reason: any) => any): ThenFail<T>;
    then<R>(onfulfilled: (value: T) => ThenFail.Thenable<R> | R, onrejected?: (reason: any) => any): ThenFail<R>;
    /**
     * add an invisible promise with no nexts to the chain, error will be thrown if it's relayed to this promise (i.e. not handled by parent promises).
     */
    done(): void;
    /**
     * add an assertion to the promises chain, if it returns false, the active promises in this chain will stop relaying on.
     * returns the current promise.
     */
    avail(assertion: () => boolean): ThenFail<T>;
    /**
     * mark start time, see also `timeEnd`.
     */
    time(): ThenFail<T>;
    /**
     * a string contains "{duration}" that will be replaced as the calculated value.
     */
    timeEnd(message?: string): ThenFail<T>;
    /**
     * get a boolean indicates whether the state of this promise is `pending`.
     */
    pending: boolean;
    /**
     * get a boolean indicates whether the state of this promise is `fulfilled`.
     */
    fulfilled: boolean;
    /**
     * get a boolean indicates whether the state of this promise is `rejected`.
     */
    rejected: boolean;
    /**
     * log the fulfilled value or rejection, or specified value.
     */
    log(object?: any): ThenFail<void>;
    /**
     * spread an array argument to arguments directly via `onfulfilled.apply(null, value)`.
     */
    spread<R>(onfulfilled: (...args: any[]) => ThenFail.Thenable<R> | R): ThenFail<R>;
    /**
     * a shortcut for `promise.then(null, onrejected)`.
     */
    fail(onrejected: (reason: any) => any): ThenFail<T>;
    /**
     * catch.
     */
    catch(onrejected: (reason: any) => any): ThenFail<T>;
    catch(ErrorType: Function, onrejected: (reason: any) => any): ThenFail<T>;
    /**
     * call `onalways` handler when its previous promise get fulfilled or rejected.
     */
    always<R>(onalways: (value: T, reason: any) => ThenFail.Thenable<R> | R): ThenFail<R>;
    /**
     * a helper that delays the relaying of fulfilled value from previous promise.
     * @param interval delay interval (milliseconds, default to 0).
     */
    delay(interval?: number): ThenFail<T>;
    /**
     * retry doing something, will be rejected if the failures execeeds limits (defaults to 2).
     * you may either return a rejected promise or throw an error to produce a failure.
     */
    retry<R>(onfulfilled: (value: T) => ThenFail.Thenable<R> | R, options?: ThenFail.IRetryOptions): ThenFail<R>;
    /**
     * resolve current promise in given time (milliseconds) with optional value.
     * the timer starts immediately when this method is called.
     */
    timeout(time: number, value?: T): ThenFail<T>;
    /**
     * relay the state of current promise to the promise given, and return current promise itself.
     */
    handle(promise: ThenFail<T>): ThenFail<T>;
    /**
     * get a promise that will be fulfilled with value `undefined` when its previous promise gets fulfilled.
     */
    void: ThenFail<void>;
    /**
     * get a promise that will be fulfilled with value `true` when its previous promise gets fulfilled.
     */
    true: ThenFail<boolean>;
    /**
     * get a promise that will be fulfilled with value `false` when its previous promise gets fulfilled.
     */
    false: ThenFail<boolean>;
    /**
     * get the nth element in the array returned.
     */
    first<T>(): ThenFail<T>;
    /**
     * get a promise that will be fulfilled with the value given when its previous promise gets fulfilled.
     */
    return<T>(value: T): ThenFail<T>;
    /**
     * get a promise already fulfilled with value `undefined`.
     */
    static void: ThenFail<void>;
    /**
     * get a promise already fulfilled with value `true`.
     */
    static true: ThenFail<boolean>;
    /**
     * get a promise already fulfilled with value `false`.
     */
    static false: ThenFail<boolean>;
    /**
     * a static then shortcut of a promise already fulfilled with value `undefined`.
     */
    static then<R>(onfulfilled: (value: void) => ThenFail.Thenable<R> | R): ThenFail<R>;
    /**
     * a static avail shortcut of a promise already fulfilled with value `undefined`.
     */
    static avail(assertion: () => boolean): ThenFail<void>;
    /**
     * a static time shortcut of a promise already fulfilled with value `undefined`.
     */
    static time(): ThenFail<void>;
    /**
     * a static delay shortcut of a promise already fulfilled with value `undefined`.
     */
    static delay(interval: number): ThenFail<void>;
    /**
     * create a promise that will be fulfilled after all promises (or values) get fulfilled,
     * and will be rejected after at least one promise (or value) gets rejected and the others get fulfilled.
     */
    static all<R>(promises: (ThenFail.Thenable<R> | R)[]): ThenFail<R[]>;
    /**
     * a static retry shortcut of a promise already fulfilled with value `undefined`.
     */
    static retry<R>(onfulfilled: (value: void) => ThenFail.Thenable<R> | R, options?: ThenFail.IRetryOptions): ThenFail<R>;
    /**
     * transverse an array, if the return value of handler is a promise, it will wait till the promise gets fulfilled. return `false` in the handler to interrupt the transversing.
     * this method returns a promise that will be fulfilled with a boolean, `true` indicates that it completes without interruption, otherwise `false`.
     */
    static each<T>(items: T[], handler: (item: T, index: number) => ThenFail.Thenable<any> | boolean | void): ThenFail<boolean>;
    /**
     * a promise version of `Array.prototype.map`.
     */
    static map<T, R>(items: T[], handler: (item: T, index: number) => ThenFail.Thenable<R> | R): ThenFail<R[]>;
    /**
     * create a promise resolved by given value.
     */
    static resolved<T>(value: ThenFail.Thenable<T> | T): ThenFail<T>;
    /**
     * create a promise already rejected by given reason.
     */
    static rejected(reason: any): ThenFail<any>;
    static rejected<T>(reason: any): ThenFail<T>;
    /**
     * invoke a node style async method.
     */
    static invoke<T>(object: Object, method: string, ...args: any[]): ThenFail<T>;
    /**
     * call a node style async function.
     */
    static call<T>(fn: Function, ...args: any[]): ThenFail<T>;
    private static _makeStackTraceLong(error, promise);
}
declare module ThenFail {
    /**
     * log rejections not been relayed.
     */
    var logRejectionsNotRelayed: boolean;
    /**
     * chain the stack trace for debugging reason.
     * this has serious performance impact, never use in production.
     */
    var longStackTrace: boolean;
    /**
     * promise states.
     */
    enum State {
        pending = 0,
        fulfilled = 1,
        rejected = 2,
    }
    /**
     * baton used to be relayed among promises.
     */
    interface IBaton<T> {
        state: State;
        value?: T;
        reason?: any;
        time?: number;
    }
    /**
     * alias for ThenFail.
     */
    var Promise: typeof ThenFail;
    /**
     * for general promise implementations.
     */
    interface Thenable<T> {
        then<R>(onfulfilled: (value: T) => Thenable<R> | R, onrejected?: (reason: any) => any): Thenable<R>;
    }
    /**
     * A small helper class to queue async operations.
     */
    class PromiseLock {
        private _promise;
        /**
         * handler will be called once this promise lock is unlocked, and it will be locked again until the promise returned by handler get fulfilled.
         */
        lock<T>(handler: () => Thenable<T> | T, unlockOnRejection?: boolean): ThenFail<T>;
        /**
         * handler will be called once this promise lock is unlocked, but unlike `lock` method, `ready` will not lock it again.
         */
        ready(): ThenFail<void>;
        ready<T>(handler: () => Thenable<T> | T): ThenFail<T>;
    }
    /**
     * default settings
     */
    module Options {
        /**
         * default settings for retry
         */
        module Retry {
            var limit: number;
            var interval: number;
            var maxInterval: number;
            var intervalMultiplier: number;
            var onretry: any;
        }
        /**
         * `log()` settings
         */
        module Log {
            /**
             * whether to throw unhandled rejection when using `log()`.
             */
            var throwUnhandledRejection: boolean;
            /**
             * value logger for `log()`.
             */
            var valueLogger: (...values: any[]) => void;
            /**
             * error logger for `log()`.
             */
            var errorLogger: (...reasons: any[]) => void;
        }
    }
    /**
     * interface for retry options
     */
    interface IRetryOptions {
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
    module Utils {
        /**
         * defaults helper
         */
        function defaults<T>(options: T, defaultOptions: T): {};
        /**
         * from Q.
         */
        var nextTick: (task: () => void) => void;
        function filterStackString(stackString: string): string;
        function captureLine(): number;
        function captureBoundaries(): void;
    }
}
export = ThenFail;
