export declare type ThenableOrValue<Value> = Promise<Value> | Thenable<Value> | Value;
/**
 * Promise like object.
 */
export interface Thenable<Value> {
    then<Return>(onfulfilled: (value: Value) => ThenableOrValue<Return>, onrejected: (reason: any) => any): Thenable<Return>;
}
export declare type Resolver<Value> = (resolve: (value?: ThenableOrValue<Value>) => void, reject: (reason: any) => void) => void;
export declare type OnFulfilledHandler<Value, Return> = (value: Value) => ThenableOrValue<Return>;
export declare type OnFulfilledSpreadHandler<Return> = (...values: any[]) => ThenableOrValue<Return>;
export declare type OnRejectedHandler<Return> = (reason: any) => ThenableOrValue<Return>;
export declare type OnAnyHandler<Return> = (valueOrReason: any) => ThenableOrValue<Return>;
export declare type OnInterruptedHandler = () => void;
export declare type NodeStyleCallback<Value> = (error: any, value: Value) => void;
export declare type MapCallback<Value, Return> = (value: Value, index: number, array: Value[]) => ThenableOrValue<Return>;
export declare type EachCallback<Value> = (value: Value, index: number, array: Value[]) => ThenableOrValue<boolean | void>;
export declare type WaterfallCallback<Value, Result> = (value: Value, result: Result, index: number, array: Value[]) => ThenableOrValue<Result>;
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
 * TimeoutError class.
 */
export declare class TimeoutError extends Error {
    name: string;
}
/**
 * ThenFail promise options.
 */
export declare let options: {
    disableUnrelayedRejectionWarning: boolean;
};
export declare class Promise<Value> implements Thenable<Value> {
    /** Current state of this promise. */
    private _state;
    /**
     * Indicates whether `onfulfilled` or `onrejected` handler has been called
     * but the resolved value has not become fulfilled yet.
     */
    private _running;
    /** The fulfilled value or rejected reason associated with this promise. */
    private _valueOrReason;
    /** Context of this promise. */
    private _context;
    /**
     * Next promise in the chain.
     * Avoid using an array if not necessary due to performance issue,
     * the same way applies to `_handledPromise(s)`.
     * If `_chainedPromise` is not undefined, `_chainedPromises` must be undefined.
     * Vice versa.
     */
    private _chainedPromise;
    /** Next promises in the chain. */
    private _chainedPromises;
    /**
     * Promise that will share the same state (and value/reason).
     *
     * Example:
     *
     *  let promiseA = Promise.then(() => {
     *      let promiseB = Promise.then(() => ...);
     *      return promiseB;
     *  });
     *
     *  The state of `promiseB` will determine the state of `promiseA`.
     *  And `promiseA` will then be in here.
     */
    private _handledPromise;
    /** Promises that will share the same state (and value/reason). */
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
     * The `then` method that follows
     * [Promises/A+ specifications](https://promisesaplus.com).
     * @param onfulfilled Fulfillment handler.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    then<Return>(onfulfilled: OnFulfilledHandler<Value, Return>, onrejected?: OnRejectedHandler<Return>): Promise<Return>;
    then(onfulfilled: void, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * Resolve the promise with a value or thenable.
     * @param value The value to fulfill or thenable to resolve.
     */
    resolve(value?: ThenableOrValue<Value>): void;
    /**
     * Reject this promise with a reason.
     * @param reason Rejection reason.
     */
    reject(reason: any): void;
    /**
     * Set up the interruption handler of the promise.
     * An interruption handler will be called if either the `onfulfilled`
     * or `onrejected` handler of the promise has been called but
     * interrupted for some reason
     * (by break signal or the canceling of the context).
     * @param oninerrupted Interruption handler.
     * @return Current promise.
     */
    interruption(oninterrupted: OnInterruptedHandler): Promise<Value>;
    /**
     * Enclose current promise context.
     * @return Current promise.
     */
    enclose(): Promise<Value>;
    /**
     * Create a promise that will be fulfilled in given time after
     * its previous promise becomes fulfilled.
     * The fulfilled value will be relayed.
     * @param timeout Timeout in milliseconds.
     * @return Current promise.
     */
    delay(timeout: number): Promise<Value>;
    /**
     * Reject the promise with `TimeoutError` if it's still pending after
     * timeout. The timer starts once this method is called
     * (usually before the fulfillment of previous promise).
     * @param timeout Tiemout in milliseconds.
     * @return Current promise.
     */
    timeout(timeout: number): Promise<Value>;
    /**
     * Handle another promise or node style callback with the value or
     * reason of current promise.
     * @param promise A promise with the same type as current promise.
     * @return Current promise.
     */
    handle(promise: Promise<Value>): Promise<Value>;
    /**
     * @param callback Node style callback.
     * @return Current promise.
     */
    handle(callback: NodeStyleCallback<Value>): Promise<Value>;
    /**
     * Create a disposable resource promise.
     * @param disposor A synchronous function to handle resource disposing.
     * @return Created disposable resource promise.
     */
    disposable(disposer: Disposer<Value>): Promise<Disposable<Value>>;
    /**
     * Like `then` with only an `onfulfilled` handler, but will relay the
     * previous fulfilled value instead of value returned by its own
     * `onfulfilled` handler.
     * @param onfulfilled Fulfillment handler.
     * @return Created promise.
     */
    tap(onfulfilled: OnFulfilledHandler<Value, void>): Promise<Value>;
    /**
     * Spread a fulfilled array-like value as arguments of the given handler.
     * @param onfulfilled Handler that takes the spread arguments.
     * @return Created promise.
     */
    spread<Return>(onfulfilled: OnFulfilledSpreadHandler<Return>): Promise<Return>;
    /**
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * Like `fail` but can specify type of reason to catch.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    catch(onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * @param ReasonType Type of reasons to catch.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    catch(ReasonType: Function, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Map callback.
     * @return Created promise.
     */
    map<Value>(callback: MapCallback<any, Value>): Promise<Value[]>;
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Each callback.
     * @return Created promise.
     */
    each<Value>(callback: EachCallback<Value>): Promise<boolean>;
    /**
     * A shortcut of `Promise.waterfall`, take the fulfilled value of
     * previous promise as initial result.
     */
    waterfall<ViaValue>(values: ViaValue[], callback: WaterfallCallback<ViaValue, Value>): Promise<Value>;
    /**
     * A shortcut of `Promise.retry`.
     */
    retry<Return>(callback: RetryCallback<Return>): Promise<Return>;
    retry<Return>(options: RetryOptions, callback: RetryCallback<Return>): Promise<Return>;
    /**
     * Log the value specified or if not, the fulfilled value or rejection
     * reason of current promise after the previous promise becomes settled.
     * @param object Specified value to log.
     * @return Current promise.
     */
    log(object?: any): Promise<Value>;
    /**
     * Call `this.then` with `onrejected` handler only, and throw the
     * rejection reason if any.
     */
    done(): void;
    /**
     * (get) A promise that will be rejected with a pre-break signal.
     */
    break: Promise<any>;
    /**
     * (get) A promise that will eventually be fulfilled with `undefined`.
     */
    void: Promise<void>;
    /**
     * (get) A promise that will eventually been fulfilled with `true`.
     */
    true: Promise<boolean>;
    /**
     * (get) A promise that will eventually been fulfilled with `false`.
     */
    false: Promise<boolean>;
    /**
     * (get) Get the context of current promise.
     */
    context: Context;
    /**
     * (get) A boolean that indicates whether the promise is pending.
     */
    pending: boolean;
    /**
     * (get) A boolean that indicates whether the promise is fulfilled.
     */
    fulfilled: boolean;
    /**
     * (get) A boolean that indicates whether the promise is rejected.
     */
    rejected: boolean;
    /**
     * (get) A boolean that indicates whether the promise is interrupted.
     */
    interrupted: boolean;
    /**
     * A shortcut of `Promise.void.then(onfulfilled)`.
     * @param onfulfilled Fulfillment handler.
     * @return Created promise.
     */
    static then<Value>(onfulfilled: OnFulfilledHandler<void, Value>): Promise<Value>;
    /**
     * Resolve a value or thenable as a promise.
     * @return The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve<Value>(value: ThenableOrValue<Value>): Promise<Value>;
    /**
     * Create a promise rejected by specified reason.
     * @param reason Rejection reason.
     * @return Created promise.
     */
    static reject(reason: any): Promise<void>;
    /**
     * @param reason Rejection reason.
     * @return Created promise.
     */
    static reject<Value>(reason: any): Promise<Value>;
    /**
     * Alias of `Promise.resolve`.
     */
    static when<Value>(value: ThenableOrValue<Value>): Promise<Value>;
    /**
     * Create a promise with given context.
     * @param context Promise context.
     * @return Created promise.
     */
    static context(context: Context): Promise<void>;
    /**
     * Create a promise that will be fulfilled with `undefined` in given
     * time.
     * @param timeout Timeout in milliseconds.
     * @return Created promise.
     */
    static delay(timeout: number): Promise<void>;
    /**
     * Create a promise that will be fulfilled:
     *   1. when all values are fulfilled.
     *   2. with the value of an array of fulfilled values.
     * And will be rejected:
     *   1. if any of the values is rejected.
     *   2. with the reason of the first rejection as its reason.
     *   3. after all values are either fulfilled or rejected.
     * @param values Values or thenables.
     * @return Created promise.
     */
    static all<Value>(values: (ThenableOrValue<Value>)[]): Promise<Value[]>;
    /**
     * A promise version of `Array.prototype.map`.
     * @param values Values to map.
     * @param callback Map callback.
     * @return Created promise.
     */
    static map<Value, Return>(values: Value[], callback: MapCallback<Value, Return>): Promise<Return[]>;
    /**
     * (breakable) Iterate elements in an array one by one.
     * Return `false` or a promise that will eventually be fulfilled with
     * `false` to interrupt iteration.
     * @param values Values to iterate.
     * @param callback Each callback.
     * @return A promise that will be fulfiled with a boolean which
     *     indicates whether the iteration completed without interruption.
     */
    static each<Value>(values: Value[], callback: EachCallback<Value>): Promise<boolean>;
    /**
     * (breakable) Pass the last result to the same callback with pre-set values.
     * @param values Pre-set values that will be passed to the callback one
     *     by one.
     * @param initialResult The initial result for the very first call.
     * @param callback Waterfall callback.
     */
    static waterfall<Value, Result>(values: Value[], initialResult: Result, callback: WaterfallCallback<Value, Result>): Promise<Result>;
    /**
     * Retry the process in the callback for several times.
     * @param callback Retry callback.
     * @return Created promise.
     */
    static retry<Return>(callback: RetryCallback<Return>): Promise<Return>;
    /**
     * @param options Retry options.
     * @param callback Retry callback.
     * @return Created promise.
     */
    static retry<Return>(options: RetryOptions, callback: RetryCallback<Return>): Promise<Return>;
    /**
     * Use a disposable resource and dispose it after been used.
     * @param disposable The disposable resource or a thenable of
     *     disposable resource.
     * @param handler Using handler.
     * @return Created promise.
     */
    static using<Resource, Return>(disposable: ThenableOrValue<Disposable<Resource>>, handler: OnFulfilledHandler<Resource, Return>): Promise<Return>;
    /**
     * Invoke a Node style asynchronous function that accepts the last
     * argument as callback.
     * @param fn Node style asynchronous function.
     * @param args Arguments.
     * @return Created promise.
     */
    static invoke<Return>(fn: Function, ...args: any[]): Promise<Return>;
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
    /** (get) The break signal. */
    static breakSignal: any;
    /** (get) The pre-break signal. */
    static preBreakSignal: any;
    /**
     * (get) A promise that has already been fulfilled with `undefined`.
     */
    static void: Promise<void>;
    /**
     * (get) A promise that has already been fulfilled with `true`.
     */
    static true: Promise<boolean>;
    /**
     * (get) A promise that has already been fulfilled with `false`.
     */
    static false: Promise<boolean>;
}
export default Promise;
export declare type PromiseLockHandler<Return> = () => ThenableOrValue<Return>;
/**
 * Promise lock is a useful helper that can act as a simple task queue.
 */
export declare class PromiseLock {
    private _promise;
    /**
     * handler will be called once this promise lock is unlocked, and it
     * will be locked again until the value returned by handler is
     * fulfilled.
     * @param handler Promise lock handler.
     * @return Created promise, will be fulfilled once the return value of
     *     lock handler gets fulfilled.
     */
    lock<Return>(handler: PromiseLockHandler<Return>): Promise<Return>;
}
export declare type RetryCallback<Return> = (lastReason: any, attemptIndex: number) => ThenableOrValue<Return>;
export interface RetryOptions {
    /** Try limit times (defaults to 3). */
    limit?: number;
    /** Interval between two tries (defaults to 0). */
    interval?: number;
}
export declare type Disposer<Resource> = (resource: Resource) => void;
export interface Disposable<Resource> {
    resource: Resource;
    dispose: Disposer<Resource>;
}
export declare const using: typeof Promise.using;
export declare const invoke: typeof Promise.invoke;
