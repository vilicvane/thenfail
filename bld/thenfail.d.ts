export interface PromiseLike<T> {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => TResult | PromiseLike<TResult>): PromiseLike<TResult>;
    then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => void): PromiseLike<TResult>;
}
export declare type Resolvable<T> = PromiseLike<T> | T;
export declare type Resolver<T> = (resolve: (value?: Resolvable<T>) => void, reject: (reason: any) => void) => void;
export declare type OnFulfilledHandler<T, TResult> = (value: T) => Resolvable<TResult>;
export declare type OnFulfilledSpreadHandler<TResult> = (...values: any[]) => Resolvable<TResult>;
export declare type OnRejectedHandler<TResult> = (reason: any) => Resolvable<TResult>;
export declare type OnAnyHandler<TResult> = (valueOrReason: any) => Resolvable<TResult>;
export declare type OnInterruptedHandler = () => void;
export declare type NodeStyleCallback<T> = (error: any, value: T) => void;
export declare type MapCallback<T, TResult> = (value: T, index: number, array: T[]) => Resolvable<TResult>;
export declare type EachCallback<T> = (value: T, index: number, array: T[]) => Resolvable<boolean | void>;
export declare type WaterfallCallback<T, TResult> = (value: T, result: TResult, index: number, array: T[]) => Resolvable<TResult>;
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
 * ThenFailError class.
 */
export declare class ThenFailError extends Error {
    message: string;
    name: any;
    stack: string;
    constructor(message: string);
}
/**
 * TimeoutError class.
 */
export declare class TimeoutError extends ThenFailError {
}
/**
 * ThenFail promise options.
 */
export declare let options: {
    disableUnrelayedRejectionWarning: boolean;
};
export declare class Promise<T> implements PromiseLike<T> {
    /** Current state of this promise. */
    private _state;
    /**
     * Indicates whether `onfulfilled` or `onrejected` handler has been called
     * but the resolved value has not become fulfilled yet.
     */
    private _running;
    /** Indicates whether this promise has been relayed or notified as unrelayed. */
    private _handled;
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
     * ```ts
     * let promiseA = Promise.then(() => {
     *     let promiseB = Promise.then(() => ...);
     *     return promiseB;
     * });
     * ```
     *
     * The state of `promiseB` will determine the state of `promiseA`.
     * And `promiseA` will then be in here.
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
    constructor(resolver: Resolver<T>);
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
     * @returns Created promise.
     */
    then<TResult>(onfulfilled: OnFulfilledHandler<T, TResult>, onrejected?: OnRejectedHandler<TResult>): Promise<TResult>;
    /**
     * Resolve the promise with a value or thenable.
     * @param resolvable The value to fulfill or thenable to resolve.
     */
    resolve(resolvable?: Resolvable<T>): void;
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
     * @returns Current promise.
     */
    interruption(oninterrupted: OnInterruptedHandler): Promise<T>;
    /**
     * Enclose current promise context.
     * @returns Current promise.
     */
    enclose(): Promise<T>;
    /**
     * Create a promise that will be fulfilled in given time after
     * its previous promise becomes fulfilled.
     * The fulfilled value will be relayed.
     * @param timeout Timeout in milliseconds.
     * @returns Current promise.
     */
    delay(timeout: number): Promise<T>;
    /**
     * Reject the promise with `TimeoutError` if it's still pending after
     * timeout. The timer starts once this method is called
     * (usually before the fulfillment of previous promise).
     * @param timeout Timeout in milliseconds.
     * @returns Current promise.
     */
    timeout(timeout: number, message?: string): Promise<T>;
    /**
     * Handle another promise or node style callback with the value or
     * reason of current promise.
     * @param promise A promise with the same type as current promise.
     * @returns Current promise.
     */
    handle(promise: Promise<T>): Promise<T>;
    /**
     * @param callback Node style callback.
     * @returns Current promise.
     */
    handle(callback: NodeStyleCallback<T>): Promise<T>;
    /**
     * Create a disposable resource promise.
     * @param disposor A synchronous function to handle resource disposing.
     * @returns Created disposable resource promise.
     */
    disposable(disposer: Disposer<T>): Promise<Disposable<T>>;
    /**
     * Like `then` with only an `onfulfilled` handler, but will relay the
     * previous fulfilled value instead of value returned by its own
     * `onfulfilled` handler.
     * @param onfulfilled Fulfillment handler.
     * @returns Created promise.
     */
    tap(onfulfilled: OnFulfilledHandler<T, void>): Promise<T>;
    /**
     * Spread a fulfilled array-like value as arguments of the given handler.
     * @param onfulfilled Handler that takes the spread arguments.
     * @returns Created promise.
     */
    spread<TResult>(onfulfilled: OnFulfilledSpreadHandler<TResult>): Promise<TResult>;
    /**
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<T>): Promise<T>;
    /**
     * Like `fail` but can specify type of reason to catch.
     * @param onrejected Rejection handler.
     * @returns Created promise.
     */
    catch(onrejected: OnRejectedHandler<T>): Promise<T>;
    /**
     * @param ReasonType Type of reasons to catch.
     * @param onrejected Rejection handler.
     * @returns Created promise.
     */
    catch(ReasonType: Function, onrejected: OnRejectedHandler<T>): Promise<T>;
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Map callback.
     * @returns Created promise.
     */
    map<T>(callback: MapCallback<any, T>): Promise<T[]>;
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Each callback.
     * @returns Created promise.
     */
    each<T>(callback: EachCallback<T>): Promise<boolean>;
    /**
     * A shortcut of `Promise.waterfall`, take the fulfilled value of
     * previous promise as initial result.
     */
    waterfall<TValue>(values: TValue[], callback: WaterfallCallback<TValue, T>): Promise<T>;
    /**
     * A shortcut of `Promise.retry`.
     */
    retry<TResult>(callback: RetryCallback<TResult>): Promise<TResult>;
    retry<TResult>(options: RetryOptions, callback: RetryCallback<TResult>): Promise<TResult>;
    /**
     * Log the value specified on fulfillment, or if not, the fulfilled value or
     * rejection reason of current promise after the previous promise becomes settled.
     * @param object Specified value to log.
     * @returns Created promise.
     */
    log(object?: any): Promise<T>;
    /**
     * Call `this.then` with `onrejected` handler only, and throw the
     * rejection reason if any.
     */
    done(): void;
    /**
     * (get) A promise that will be rejected with a pre-break signal if previous
     * promise is fulfilled with a non-`false` value.
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
     * @returns Created promise.
     */
    static then<TResult>(onfulfilled: OnFulfilledHandler<void, TResult>): Promise<TResult>;
    /**
     * Resolve a value or thenable as a promise.
     * @returns The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve(): Promise<void>;
    /**
     * @returns The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve<T>(resolvable: Resolvable<T>): Promise<T>;
    /**
     * Create a promise rejected by specified reason.
     * @param reason Rejection reason.
     * @returns Created promise.
     */
    static reject(reason: any): Promise<void>;
    /**
     * @param reason Rejection reason.
     * @returns Created promise.
     */
    static reject<T>(reason: any): Promise<T>;
    /**
     * Alias of `Promise.resolve`.
     */
    static when<T>(value: Resolvable<T>): Promise<T>;
    /**
     * Create a promise with given context.
     * @param context Promise context.
     * @returns Created promise.
     */
    static context(context: Context): Promise<void>;
    /**
     * Create a promise that will be fulfilled with `undefined` in given
     * time.
     * @param timeout Timeout in milliseconds.
     * @returns Created promise.
     */
    static delay(timeout: number): Promise<void>;
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
    static all<T>(resolvables: Resolvable<T>[]): Promise<T[]>;
    /**
     * Create a promise that is settled the same way as the first passed promise to settle.
     * It resolves or rejects, whichever happens first.
     * @param resolvables Promises or values to race.
     * @returns Created promise.
     */
    static race<TResult>(resolvables: Resolvable<TResult>[]): Promise<TResult>;
    /**
     * A promise version of `Array.prototype.map`.
     * @param values Values to map.
     * @param callback Map callback.
     * @returns Created promise.
     */
    static map<T, TResult>(values: T[], callback: MapCallback<T, TResult>): Promise<TResult[]>;
    /**
     * (breakable) Iterate elements in an array one by one.
     * TResult `false` or a promise that will eventually be fulfilled with
     * `false` to interrupt iteration.
     * @param values Values to iterate.
     * @param callback Each callback.
     * @returns A promise that will be fulfiled with a boolean which
     *     indicates whether the iteration completed without interruption.
     */
    static each<T>(values: T[], callback: EachCallback<T>): Promise<boolean>;
    /**
     * (breakable) Pass the last result to the same callback with pre-set values.
     * @param values Pre-set values that will be passed to the callback one
     *     by one.
     * @param initialResult The initial result for the very first call.
     * @param callback Waterfall callback.
     */
    static waterfall<T, TResult>(values: T[], initialResult: TResult, callback: WaterfallCallback<T, TResult>): Promise<TResult>;
    /**
     * Retry the process in the callback for several times.
     * @param callback Retry callback.
     * @returns Created promise.
     */
    static retry<TResult>(callback: RetryCallback<TResult>): Promise<TResult>;
    /**
     * @param options Retry options.
     * @param callback Retry callback.
     * @returns Created promise.
     */
    static retry<TResult>(options: RetryOptions, callback: RetryCallback<TResult>): Promise<TResult>;
    /**
     * Use a disposable resource and dispose it after been used.
     * @param disposable The disposable resource or a thenable of
     *     disposable resource.
     * @param handler Using handler.
     * @returns Created promise.
     */
    static using<T, TResult>(disposable: Resolvable<Disposable<T>>, handler: OnFulfilledHandler<T, TResult>): Promise<TResult>;
    /**
     * Invoke a Node style asynchronous function that accepts the last
     * argument as callback.
     * @param fn Node style asynchronous function.
     * @param args Arguments.
     * @returns Created promise.
     */
    static invoke<TResult>(fn: Function, ...args: any[]): Promise<TResult>;
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
export declare type PromiseLockHandler<TResult> = () => Resolvable<TResult>;
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
     * @returns Created promise, will be fulfilled once the return value of
     *     lock handler gets fulfilled.
     */
    lock<TResult>(handler: PromiseLockHandler<TResult>): Promise<TResult>;
}
export declare type RetryCallback<TResult> = (lastReason: any, attemptIndex: number) => Resolvable<TResult>;
export interface RetryOptions {
    /** Try limit times (defaults to 3). */
    limit?: number;
    /** Interval between two tries (defaults to 0). */
    interval?: number;
}
export declare type Disposer<TResource> = (resource: TResource) => void;
export interface Disposable<TResource> {
    resource: TResource;
    dispose: Disposer<TResource>;
}
export declare const using: typeof Promise.using;
export declare const invoke: typeof Promise.invoke;
