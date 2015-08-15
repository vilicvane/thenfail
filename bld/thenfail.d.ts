/**
 * Promise like object.
 */
export interface Thenable<Value> {
    then<Return>(onfulfilled: (value: Value) => Promise<Return> | Thenable<Return> | Return, onrejected?: (reason: any) => any): Thenable<Return>;
}
export interface Resolver<Value> {
    (resolve: (value?: Promise<Value> | Thenable<Value> | Value) => void, reject: (reason: any) => void): void;
}
export interface OnFulfilledHandler<Value, Return> {
    (value: Value): Promise<Return> | Thenable<Return> | Return;
}
export interface OnRejectedHandler<Return> {
    (reason: any): Promise<Return> | Thenable<Return> | Return;
}
export interface OnAnyHandler<Return> {
    (valueOrReason: any): Promise<Return> | Thenable<Return> | Return;
}
export interface OnInterruptedHandler {
    (): void;
}
export interface NodeStyleCallback<Value> {
    (error: any, value: Value): void;
}
export interface MapCallback<Value, Return> {
    (value: Value, index: number, array: Value[]): Promise<Return> | Thenable<Return> | Return;
}
export interface EachCallback<Value> {
    (value: Value, index: number, array: Value[]): Promise<boolean | void> | Thenable<boolean | void> | boolean | void;
}
export declare class Context {
    _disposed: boolean;
    _enclosed: boolean;
    _subContexts: Context[];
    /**
     * (get) A boolean that indicates whether this promise context is disposed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    disposed: boolean;
    /**
     * (get) A boolean that indicates whether this promise context is enclosed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    enclosed: boolean;
    /**
     * Dispose this promise context.
     * See https://github.com/vilic/thenfail# for more information.
     */
    dispose(): void;
    /**
     * Dispose all sub contexts of this promise context.
     */
    disposeSubContexts(): void;
}
/**
 * Possible states of a promise.
 */
export declare const enum State {
    pending = 0,
    fulfilled = 1,
    rejected = 2,
    interrupted = 3,
}
export declare module _CustomError {
    class Error {
        constructor(message?: string);
        name: string;
        message: string;
        stack: string;
    }
    class TimeoutError extends Error {
        name: string;
    }
}
export declare var TimeoutError: typeof _CustomError.TimeoutError;
export declare type TimeoutError = _CustomError.TimeoutError;
/**
 * ThenFail promise options.
 */
export declare var options: {
    disableUnrelayedRejectionWarning: boolean;
};
export declare class Promise<Value> implements Thenable<Value> {
    private _state;
    private _running;
    private _valueOrReason;
    private _context;
    /**
     * Next promises in the chain.
     */
    private _chainedPromise;
    private _chainedPromises;
    /**
     * Promises that will share the same state (and value/reason).
     *
     * Example:
     *
     *  var promiseA = Promise.then(() => {
     *      var promiseB = Promise.then(() => ...);
     *      return promiseB;
     *  });
     *
     *  The state of `promiseB` will determine the state of `promiseA`.
     *  And `promiseA` will then be in here.
     */
    private _handledPromise;
    private _handledPromises;
    private _onPreviousFulfilled;
    private _onPreviousRejected;
    private _onPreviousInterrupted;
    /**
     * Promise constructor.
     */
    constructor();
    constructor(resolver: Resolver<Value>);
    constructor(context: Context);
    /**
     * Get the state from previous promise in chain.
     */
    private _grab(previousState, previousValueOrReason?);
    /**
     * Invoke `onfulfilled` or `onrejected` handlers.
     */
    private _run(handler, previousValueOrReason);
    /**
     * The resolve process defined in Promises/A+ specifications.
     */
    private _unpack(value, callback);
    /**
     * Set the state of current promise and relay it to next promises.
     */
    private _relay(state, valueOrReason?);
    /**
     * The `then` method that follows Promises/A+ specifications <https://promisesaplus.com>.
     * To learn how to use promise, please check out <https://github.com/vilic/thenfail>.
     */
    then<Return>(onfulfilled: OnFulfilledHandler<Value, Return>, onrejected?: OnRejectedHandler<Return>): Promise<Return>;
    then(onfulfilled: void, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * Resolve this promise with a value or thenable.
     * @param value A normal value, or a promise/thenable.
     */
    resolve(value?: Promise<Value> | Thenable<Value> | Value): void;
    /**
     * Reject this promise with a reason.
     */
    reject(reason: any): void;
    /**
     * Add an interruption handler. This handler will only be invoked if previous
     * onfulfilled/onrejected handler has run and been interrupted.
     */
    interruption(oninterrupted: OnInterruptedHandler): Promise<Value>;
    /**
     * Enclose current promise context.
     */
    enclose(): Promise<Value>;
    /**
     * Delay a period of time (milliseconds).
     */
    delay(timeout: number): Promise<Value>;
    /**
     * Set a timeout of current promise context. This will enclose current promise context.
     */
    timeout(timeout: number): Promise<Value>;
    /**
     * Handle another promise with the same state (and value/reason) of the current one.
     * @return Current promise.
     */
    handle(promise: Promise<Value>): Promise<Value>;
    handle(callback: NodeStyleCallback<Value>): Promise<Value>;
    /**
     * Create a disposable resource promise.
     * @param disposer
     */
    disposable(disposer: Disposer<Value>): Promise<Disposable<Value>>;
    /**
     * Handle `fulfilled` without change its original return value.
     *
     * Example:
     *
     *  promise
     *      .resolved(123)
     *      .tap(value => {
     *          console.log(value); // 123
     *          return Promise.delay(100);
     *      })
     *      .then(value => {
     *          console.log(value); // 123
     *      });
     */
    tap(onfulfilled: OnFulfilledHandler<Value, void>): Promise<Value>;
    /**
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * Catch specific type of error if specified. Otherwise it the same like `promise.fail`.
     */
    catch(onrejected: OnRejectedHandler<Value>): Promise<Value>;
    catch(ErrorType: Function, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of previous promise is a array.
     */
    map<Value>(callback: MapCallback<any, Value>): Promise<Value[]>;
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of previous promise is a array.
     */
    each<Value>(callback: EachCallback<Value>): Promise<boolean>;
    /**
     * Log fulfilled value or rejected reason of current promise.
     * @return Current promise.
     */
    log(): Promise<Value>;
    /**
     * Log given value or rejected reason of current promise.
     * @return Current promise.
     */
    log(object: any): Promise<Value>;
    /**
     * Call `this.then` with `onrejected` handler only, and throw the rejection error if any.
     */
    done(): void;
    /**
     * (get) A shortcut of `promise.then(() => { Promise.break; })`.
     * See https://github.com/vilic/thenfail# for more information.
     */
    break: Promise<void>;
    /**
     * (get) A promise that will eventually been fulfilled with value `undefined`.
     */
    void: Promise<void>;
    /**
     * (get) A promise that will eventually been fulfilled with value `true`.
     */
    true: Promise<boolean>;
    /**
     * (get) A promise that will eventually been fulfilled with value `false`.
     */
    false: Promise<boolean>;
    /**
     * (get) Get the context of current promise.
     */
    context: Context;
    /**
     * (get) A boolean that indicates whether the current promise is pending.
     */
    pending: boolean;
    /**
     * (get) A boolean that indicates whether the current promise is fulfilled.
     */
    fulfilled: boolean;
    /**
     * (get) A boolean that indicates whether the current promise is rejected.
     */
    rejected: boolean;
    /**
     * (get) A boolean that indicates whether the current promise is interrupted.
     */
    interrupted: boolean;
    /**
     * A shortcut of `Promise.void.then(onfulfilled)`.
     */
    static then<Value>(onfulfilled: OnFulfilledHandler<void, Value>): Promise<Value>;
    /**
     * A shortcut of `Promise.then(() => value)`.
     * @return Return the value itself if it's an instanceof ThenFail Promise.
     */
    static resolve<Value>(value: Promise<Value> | Thenable<Value> | Value): Promise<Value>;
    /**
     * A shortcut of `Promise.then(() => { throw reason; })`.
     */
    static reject(reason: any): Promise<void>;
    static reject<Value>(reason: any): Promise<Value>;
    /**
     * Alias of `Promise.resolve`.
     */
    static when<Value>(value: Promise<Value> | Thenable<Value> | Value): Promise<Value>;
    /**
     * Create a promise under given context.
     */
    static context(context: Context): Promise<void>;
    /**
     * Delay a period of time (milliseconds).
     */
    static delay(timeout: number): Promise<void>;
    /**
     * Create a promise that will be fulfilled:
     *  1. when all values are fulfilled.
     *  2. with the value of an array of fulfilled values.
     * And will be rejected:
     *  1. if any of the values is rejected.
     *  2. with the reason of the first rejection as its reason.
     *  3. after all values are either fulfilled or rejected.
     */
    static all<Value>(values: (Promise<Value> | Thenable<Value> | Value)[]): Promise<Value[]>;
    /**
     * A promise version of `array.map`.
     */
    static map<Value, Return>(values: Value[], callback: MapCallback<Value, Return>): Promise<Return[]>;
    /**
     * Iterate elements in an array one by one.
     * Return `false` or a promise that will eventually be fulfilled with `false` to interrupt iteration.
     */
    static each<Value>(values: Value[], callback: EachCallback<Value>): Promise<boolean>;
    /**
     * (fake statement) This getter will always throw a break signal that interrupts the promises chain.
     *
     * Example:
     *
     *  promise
     *      .then(() => {
     *          if (toBreak) {
     *              Promise.break;
     *          }
     *
     *          // Or not to break.
     *      })
     *      .then(() => {
     *          // If `toBreak` is true, it will never enter this handler.
     *      }, () => {
     *          // Nor this handler.
     *      });
     */
    static break: void;
    /**
     * (get) A promise that has already been fulfilled with value `undefined`.
     */
    static void: Promise<void>;
    /**
     * (get) A promise that has already been fulfilled with value `true`.
     */
    static true: Promise<boolean>;
    /**
     * (get) A promise that has already been fulfilled with value `false`.
     */
    static false: Promise<boolean>;
}
export default Promise;
export interface PromiseLockHandler<Return> {
    (): Promise<Return> | Thenable<Return> | Return;
}
export declare class PromiseLock {
    private _promise;
    /**
     * handler will be called once this promise lock is unlocked, and it will be
     * locked again until the value returned by handler is fulfilled.
     */
    lock<Return>(handler: PromiseLockHandler<Return>): Promise<Return>;
}
export interface Disposer<Resource> {
    (resource: Resource): void;
}
export interface Disposable<Resource> {
    resource: Resource;
    dispose: Disposer<Resource>;
}
/**
 * Use a disposable resource and dispose it after been used.
 */
export declare function using<Resource, Return>(disposable: Thenable<Disposable<Resource>> | Disposable<Resource>, handler: OnFulfilledHandler<Resource, Return>): Promise<Return>;
