/**
 * ThenFail v0.3
 * Just another Promises/A+ Library
 * 
 * https://github.com/vilic/thenfail
 * 
 * MIT License
 */

import { asap } from './utils';

/////////////
// Promise //
/////////////

export type ThenableOrValue<Value> = Promise<Value> | Thenable<Value> | Value;

/**
 * Promise like object.
 */
export interface Thenable<Value> {
    then<Return>(onfulfilled: (value: Value) => ThenableOrValue<Return>, onrejected: (reason: any) => any): Thenable<Return>;
}

export type Resolver<Value> = (
    resolve: (value?: ThenableOrValue<Value>) => void,
    reject: (reason: any) => void
) => void;

export type OnFulfilledHandler<Value, Return> = (value: Value) => ThenableOrValue<Return>;

export type OnFulfilledSpreadHandler<Return> = (...values: any[]) => ThenableOrValue<Return>;

export type OnRejectedHandler<Return> = (reason: any) => ThenableOrValue<Return>;

export type OnAnyHandler<Return> = (valueOrReason: any) => ThenableOrValue<Return>;

export type OnInterruptedHandler = () => void;

export type NodeStyleCallback<Value> = (error: any, value: Value) => void;

export type MapCallback<Value, Return> = (value: Value, index: number, array: Value[]) => ThenableOrValue<Return>;

export type EachCallback<Value> = (value: Value, index: number, array: Value[]) => ThenableOrValue<boolean | void>;

export type WaterfallCallback<Value, Result> = (value: Value, result: Result, index: number, array: Value[]) => ThenableOrValue<Result>;

export class Context {
    _disposed = false;
    _enclosed = false;

    _subContexts: Context[];
    
    /**
     * (get) A boolean that indicates whether this promise context is disposed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    get disposed(): boolean {
        return this._disposed;
    }
    
    /**
     * (get) A boolean that indicates whether this promise context is enclosed.
     * See https://github.com/vilic/thenfail# for more information.
     */
    get enclosed(): boolean {
        return this._enclosed;
    }
    
    /**
     * Dispose this promise context.
     * See https://github.com/vilic/thenfail# for more information.
     */
    dispose(): void {
        this._disposed = true;
        this.disposeSubContexts();
    }
    
    /**
     * Dispose all sub contexts of this promise context.
     */
    disposeSubContexts(): void {
        if (this._subContexts) {
            for (let context of this._subContexts) {
                context.dispose();
            }
            
            this._subContexts = undefined;
        }
    }
}

/**
 * Possible states of a promise.
 */
const enum State {
    pending,
    fulfilled,
    rejected,
    interrupted
}

/**
 * TimeoutError class.
 */
export class TimeoutError extends Error {
    name = 'TimeoutError';
}

/**
 * The signal objects for interrupting promises context.
 */
const BREAK_SIGNAL = {};
const PRE_BREAK_SIGNAL = {};

/**
 * ThenFail promise options.
 */
export let options = {
    disableUnrelayedRejectionWarning: false
};

// The core abstraction of this implementation is to imagine the behavior of promises
// as relay runners.
//  1. Grab the baton state (and value/reason).
//  2. Run and get its own state.
//  3. Relay the new state to next runners.

export class Promise<Value> implements Thenable<Value> {
    /** Current state of this promise. */
    private _state = State.pending;
    /**
     * Indicates whether `onfulfilled` or `onrejected` handler has been called
     * but the resolved value has not become fulfilled yet.
     */
    private _running = false;
    /** The fulfilled value or rejected reason associated with this promise. */
    private _valueOrReason: any;
    /** Context of this promise. */
    private _context: Context;

    /** 
     * Next promise in the chain.
     * Avoid using an array if not necessary due to performance issue,
     * the same way applies to `_handledPromise(s)`.
     * If `_chainedPromise` is not undefined, `_chainedPromises` must be undefined.
     * Vice versa.
     */
    private _chainedPromise: Promise<any>;
    /** Next promises in the chain. */
    private _chainedPromises: Promise<any>[];

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
    private _handledPromise: Promise<Value>;
    /** Promises that will share the same state (and value/reason). */
    private _handledPromises: Promise<Value>[];
    
    private _onPreviousFulfilled: OnFulfilledHandler<any, Value>;
    private _onPreviousRejected: OnRejectedHandler<Value>;
    private _onPreviousInterrupted: OnInterruptedHandler;

    /**
     * Promise constructor.
     */
    constructor();
    constructor(resolver: Resolver<Value>);
    constructor(context: Context);
    constructor(resolverOrContext?: Resolver<Value> | Context) {
        if (resolverOrContext instanceof Context && !resolverOrContext._enclosed) {
            this._context = resolverOrContext;
        } else {
            this._context = new Context();
        }
        
        if (typeof resolverOrContext === 'function') {
            try {
                (<Resolver<Value>>resolverOrContext)(
                    value => this.resolve(value),
                    reason => this.reject(reason)
                );
            } catch (error) {
                this.reject(error);
            }
        }
    }

    /**
     * Get the state from previous promise in chain.
     */
    private _grab(previousState: State, previousValueOrReason?: any): void {
        if (this._state !== State.pending) {
            return;
        }
        
        let handler: OnAnyHandler<ThenableOrValue<Value>>;
        
        if (previousState === State.fulfilled) {
            handler = this._onPreviousFulfilled;
        } else if (previousState === State.rejected) {
            handler = this._onPreviousRejected;
        }
        
        if (handler) {
            this._run(handler, previousValueOrReason);
        } else {
            this._relay(previousState, previousValueOrReason);
        }
    }

    /**
     * Invoke `onfulfilled` or `onrejected` handlers.
     */
    private _run(handler: OnAnyHandler<any>, previousValueOrReason: any): void {
        this._running = true;
        
        asap(() => {
            let ret: ThenableOrValue<Value>;

            try {
                ret = handler(previousValueOrReason);
            } catch (error) {
                this._relay(State.rejected, error);
                this._running = false;
                return;
            }

            this._unpack(ret, (state, valueOrReason) => {
                this._relay(state, valueOrReason);
                this._running = false;
            });
        });
    }
    
    /**
     * The resolve process defined in Promises/A+ specifications.
     */
    private _unpack(value: ThenableOrValue<Value>, callback: (state: State, valueOrReason: any) => void): void {
        if (this === value) {
            callback(State.rejected, new TypeError('The promise should not return itself'));
        } else if (value instanceof Promise) {
            if (value._state === State.pending) {
                if (value._handledPromise) {
                    value._handledPromises = [value._handledPromise, this];
                    value._handledPromise = undefined;
                } else if (value._handledPromises) {
                    value._handledPromises.push(this);
                } else {
                    value._handledPromise = this;
                }
                
                let context = this._context;
                
                if (context._subContexts) {
                    context._subContexts.push(value._context);
                } else {
                    context._subContexts = [value._context];
                }
            } else {
                callback(value._state, value._valueOrReason);
            }
        } else if (value) {
            switch (typeof value) {
                case 'object':
                case 'function':
                    try {
                        let then = (<Thenable<any>>value).then;

                        if (typeof then === 'function') {
                            then.call(
                                value,
                                (value: any) => {
                                    if (callback) {
                                        this._unpack(value, callback);
                                        callback = undefined;
                                    }
                                },
                                (reason: any) => {
                                    if (callback) {
                                        callback(State.rejected, reason);
                                        callback = undefined;
                                    }
                                }
                            );

                            break;
                        }
                    } catch (e) {
                        if (callback) {
                            callback(State.rejected, e);
                            callback = undefined;
                        }

                        break;
                    }
                default:
                    callback(State.fulfilled, value);
                    break;
            }
        } else {
            callback(State.fulfilled, value);
        }
    }

    /**
     * Set the state of current promise and relay it to next promises.
     */
    private _relay(state: State, valueOrReason?: any): void {
        if (this._state !== State.pending) {
            return;
        }
        
        let relayState: State;
        
        if (
            valueOrReason === BREAK_SIGNAL ||
            valueOrReason === PRE_BREAK_SIGNAL ||
            this._context._disposed
        ) {
            relayState = State.interrupted;
            
            if (this._running) {
                this._state = State.fulfilled;
                
                if (this._onPreviousInterrupted) {
                    try {
                        let handler = this._onPreviousInterrupted;
                        handler();
                    } catch (error) {
                        relayState = State.rejected;
                        valueOrReason = error;
                    }
                }
            } else {
                this._state = State.interrupted;
            }
        } else {
            relayState = state;
            this._state = state;
            this._valueOrReason = valueOrReason;
        }
        
        if (relayState === State.interrupted) {
            if (this._chainedPromise) {
                if (this._chainedPromise._context === this._context) {
                    this._chainedPromise._relay(State.interrupted);
                } else {
                    this._chainedPromise._grab(State.fulfilled);
                }
            } else if (this._chainedPromises) {
                for (let promise of this._chainedPromises) {
                    if (promise._context === this._context) {
                        promise._relay(State.interrupted);
                    } else {
                        promise._grab(State.fulfilled);
                    }
                }
            }
            
            relayState = State.fulfilled;
            
            if (valueOrReason === PRE_BREAK_SIGNAL) {
                valueOrReason = BREAK_SIGNAL;
            } else {
                valueOrReason = undefined;
            }
            
            if (this._handledPromise) {
                this._handledPromise._relay(relayState, valueOrReason);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._relay(relayState, valueOrReason);
                }
            }
        } else {
            if (this._chainedPromise) {
                this._chainedPromise._grab(relayState, valueOrReason);
            } else if (this._chainedPromises) {
                for (let promise of this._chainedPromises) {
                    promise._grab(relayState, valueOrReason);
                }
            }
            
            if (this._handledPromise) {
                this._handledPromise._relay(relayState, valueOrReason);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._relay(relayState, valueOrReason);
                }
            }
        }
        
        asap(() => {
            if (state === State.rejected) {
                let relayed = !!(this._chainedPromise || this._chainedPromises || this._handledPromise || this._handledPromises);
                
                if (!options.disableUnrelayedRejectionWarning && !relayed) {
                    let error = valueOrReason && (valueOrReason.stack || valueOrReason.message) || valueOrReason;
                    console.warn(`An unrelayed rejection happens:\n${error}`);
                }
            }
    
            if (this._onPreviousFulfilled) {
                this._onPreviousFulfilled = undefined;
            }
            
            if (this._onPreviousRejected) {
                this._onPreviousRejected = undefined;
            }
            
            if (this._onPreviousInterrupted) {
                this._onPreviousInterrupted = undefined;
            }
            
            if (this._chainedPromise) {
                this._chainedPromise = undefined;
            } else {
                this._chainedPromises = undefined;
            }
            
            if (this._handledPromise) {
                this._handledPromise = undefined;
            } else {
                this._handledPromises = undefined;
            }
        });
    }
    
    /**
     * The `then` method that follows
     * [Promises/A+ specifications](https://promisesaplus.com).
     * @param onfulfilled Fulfillment handler.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    then<Return>(onfulfilled: OnFulfilledHandler<Value, Return>, onrejected?: OnRejectedHandler<Return>): Promise<Return>;
    then(onfulfilled: void, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    then(onfulfilled?: any, onrejected?: any): Promise<any> {
        let promise = new Promise<any>(this._context);
        
        if (typeof onfulfilled === 'function') {
            promise._onPreviousFulfilled = onfulfilled;
        }
        
        if (typeof onrejected === 'function') {
            promise._onPreviousRejected = onrejected;
        }
        
        if (this._state === State.pending) {
            if (this._chainedPromise) {
                this._chainedPromises = [this._chainedPromise, promise];
                this._chainedPromise = undefined;
            } else if (this._chainedPromises) {
                this._chainedPromises.push(promise);
            } else {
                this._chainedPromise = promise;
            }
        } else {
            promise._grab(this._state, this._valueOrReason);
        }
        
        return promise;
    }
    
    /**
     * Resolve the promise with a value or thenable.
     * @param value The value to fulfill or thenable to resolve.
     */
    resolve(value?: ThenableOrValue<Value>): void {
        this._unpack(value, (state, valueOrReason) => this._grab(state, valueOrReason));
    }
    
    /**
     * Reject this promise with a reason.
     * @param reason Rejection reason.
     */
    reject(reason: any): void {
        this._grab(State.rejected, reason);
    }
    
    /**
     * Set up the interruption handler of the promise.
     * An interruption handler will be called if either the `onfulfilled`
     * or `onrejected` handler of the promise has been called but
     * interrupted for some reason
     * (by break signal or the canceling of the context).
     * @param oninerrupted Interruption handler.
     * @return Current promise.
     */
    interruption(oninterrupted: OnInterruptedHandler): Promise<Value> {
        if (this._state === State.pending) {
            if (this._onPreviousInterrupted) {
                throw new Error('Interruption handler has already been set');
            }
            
            this._onPreviousInterrupted = oninterrupted;
        } else {
            // To unify error handling behavior, handler would not be invoked
            // if it's added after promise state being no longer pending.
            console.warn('Handler added after promise state no longer being pending');
        }
        
        return this;
    }
    
    /**
     * Enclose current promise context.
     * @return Current promise.
     */
    enclose(): Promise<Value> {
        this._context._enclosed = true;
        return this;
    }
    
    /**
     * Create a promise that will be fulfilled in given time after
     * its previous promise becomes fulfilled.
     * The fulfilled value will be relayed.
     * @param timeout Timeout in milliseconds.
     * @return Current promise.
     */
    delay(timeout: number): Promise<Value> {
        return this.then(value => {
            return new Promise<Value>(resolve => {
                setTimeout(() => resolve(value), Math.floor(timeout) || 0);
            });
        });
    }
    
    /**
     * Reject the promise with `TimeoutError` if it's still pending after
     * timeout. The timer starts once this method is called
     * (usually before the fulfillment of previous promise).
     * @param timeout Tiemout in milliseconds.
     * @return Current promise.
     */
    timeout(timeout: number): Promise<Value> {
        this._context._enclosed = true;
        
        setTimeout(() => {
            if (this._state === State.pending) {
                this._relay(State.rejected, new TimeoutError());
                this._context.disposeSubContexts();
            }
        }, Math.floor(timeout) || 0);
        
        return this;
    }
    
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
    handle(promiseOrCallback: Promise<Value> | NodeStyleCallback<Value>): Promise<Value> {
        if (promiseOrCallback instanceof Promise) {
            if (this._state === State.pending) {
                if (this._handledPromise) {
                    this._handledPromises = [this._handledPromise, promiseOrCallback];
                    this._handledPromise = undefined;
                } else if (this._handledPromises) {
                    this._handledPromises.push(promiseOrCallback);
                } else {
                    this._handledPromise = promiseOrCallback;
                }
            } else {
                promiseOrCallback._relay(this._state, this._valueOrReason);
            }
        } else if (typeof promiseOrCallback === 'function') {
            this.then(
                value => {
                    (<NodeStyleCallback<Value>>promiseOrCallback)(undefined, value);
                },
                reason => {
                    (<NodeStyleCallback<Value>>promiseOrCallback)(reason, undefined)
                }
            );
        }
        
        return this;
    }
    
    /**
     * Create a disposable resource promise.
     * @param disposor A synchronous function to handle resource disposing.
     * @return Created disposable resource promise.
     */
    disposable(disposer: Disposer<Value>): Promise<Disposable<Value>> {
        return this.then(resource => {
            return {
                resource,
                dispose: disposer
            };
        });
    }
    
    /**
     * Like `then` with only an `onfulfilled` handler, but will relay the
     * previous fulfilled value instead of value returned by its own
     * `onfulfilled` handler.
     * @param onfulfilled Fulfillment handler.
     * @return Created promise.
     */
    tap(onfulfilled: OnFulfilledHandler<Value, void>): Promise<Value> {
        let relayValue: Value;
        return this
            .then(value => {
                relayValue = value;
                return onfulfilled(value);
            })
            .then(() => relayValue);
    }
    
    /**
     * Spread a fulfilled array-like value as arguments of the given handler.
     * @param onfulfilled Handler that takes the spread arguments.
     * @return Created promise.
     */
    spread<Return>(onfulfilled: OnFulfilledSpreadHandler<Return>): Promise<Return> {
        return this.then(value => onfulfilled.apply(undefined, value));
    }

    /**
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<Value>): Promise<Value> {
        return this.then<Value>(undefined, onrejected);
    }

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
    catch(ReasonType: Function | OnRejectedHandler<Value>, onrejected?: OnRejectedHandler<Value>): Promise<Value> {
        if (typeof onrejected === 'function') {
            return this.then<Value>(undefined, reason => {
                if (reason instanceof ReasonType) {
                    return onrejected(reason);
                } else {
                    throw reason;
                }
            });
        } else {
            onrejected = <OnRejectedHandler<Value>>ReasonType;
            return this.then<Value>(undefined, onrejected);
        }
    }
    
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of 
     * previous promise is a array.
     * @param callback Map callback.
     * @return Created promise.
     */
    map<Value>(callback: MapCallback<any, Value>): Promise<Value[]> {
        return this.then((values: any) => Promise.map(values, callback));
    }
    
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Each callback.
     * @return Created promise.
     */
    each<Value>(callback: EachCallback<Value>): Promise<boolean> {
        return this.then((values: any) => Promise.each(values, callback));
    }
    
    /**
     * A shortcut of `Promise.waterfall`, take the fulfilled value of
     * previous promise as initial result.
     */
    waterfall<ViaValue>(values: ViaValue[], callback: WaterfallCallback<ViaValue, Value>): Promise<Value> {
        return this.then(initialResult => Promise.waterfall(values, initialResult, callback));
    }
    
    /**
     * A shortcut of `Promise.retry`.
     */
    retry<Return>(callback: RetryCallback<Return>): Promise<Return>;
    retry<Return>(options: RetryOptions, callback: RetryCallback<Return>): Promise<Return>;
    retry<Return>(options: RetryOptions, callback?: RetryCallback<Return>): Promise<Return> {
        return this.then(() => Promise.retry(options, callback));
    }
    
    /**
     * Log the value specified or if not, the fulfilled value or rejection
     * reason of current promise after the previous promise becomes settled.
     * @param object Specified value to log.
     * @return Current promise.
     */
    log(object?: any): Promise<Value> {
        let promise = new Promise<Value>();
        
        this.handle(promise);
        
        promise.then(value => {
            if (object !== undefined) {
                console.log(object);
            } else if (value !== undefined) {
                console.log(value);
            }
        }, reason => {
            console.error(reason && (reason.stack || reason.message) || reason);
        });
        
        return this;
    }
    
    /**
     * Call `this.then` with `onrejected` handler only, and throw the
     * rejection reason if any.
     */
    done(): void {
        this.then(undefined, reason => {
            asap(() => {
                throw reason;
            });
        });
    }
    
    /**
     * (get) A promise that will be rejected with a pre-break signal.
     */
    get break(): Promise<any> {
        return this.then(() => {
            throw PRE_BREAK_SIGNAL;
        });
    }
    
    /**
     * (get) A promise that will eventually be fulfilled with `undefined`.
     */
    get void(): Promise<void> {
        return this.then(() => undefined);
    }
    
    /**
     * (get) A promise that will eventually been fulfilled with `true`.
     */
    get true(): Promise<boolean> {
        return this.then(() => true);
    }
    
    /**
     * (get) A promise that will eventually been fulfilled with `false`.
     */
    get false(): Promise<boolean> {
        return this.then(() => false);
    }
    
    /**
     * (get) Get the context of current promise.
     */
    get context(): Context {
        return this._context;
    }
    
    /**
     * (get) A boolean that indicates whether the promise is pending.
     */
    get pending(): boolean {
        return this._state === State.pending;
    }
    
    /**
     * (get) A boolean that indicates whether the promise is fulfilled.
     */
    get fulfilled(): boolean {
        return this._state === State.fulfilled;
    }
    
    /**
     * (get) A boolean that indicates whether the promise is rejected.
     */
    get rejected(): boolean {
        return this._state === State.rejected;
    }
    
    /**
     * (get) A boolean that indicates whether the promise is interrupted.
     */
    get interrupted(): boolean {
        return this._state === State.interrupted;
    }
    
    // Static helpers
    
    /**
     * A shortcut of `Promise.void.then(onfulfilled)`.
     * @param onfulfilled Fulfillment handler.
     * @return Created promise.
     */
    static then<Value>(onfulfilled: OnFulfilledHandler<void, Value>): Promise<Value> {
        return Promise.void.then(onfulfilled);
    }
    
    /**
     * Resolve a value or thenable as a promise.
     * @return The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve<Value>(value: ThenableOrValue<Value>): Promise<Value> {
        if (value instanceof Promise) {
            return value;
        } else {
            let promise = new Promise<Value>();
            promise.resolve(value);
            return promise;
        }
    }
    
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
    static reject<Value>(reason: any): Promise<Value> {
        let promise = new Promise<Value>();
        promise.reject(reason);
        return promise;
    }
    
    /**
     * Alias of `Promise.resolve`.
     */
    static when<Value>(value: ThenableOrValue<Value>): Promise<Value> {
        return Promise.resolve(value);
    }
    
    /**
     * Create a promise with given context.
     * @param context Promise context.
     * @return Created promise.
     */
    static context(context: Context): Promise<void> {
        let promise = new Promise<void>(context);
        promise.resolve();
        return promise;
    }
    
    /**
     * Create a promise that will be fulfilled with `undefined` in given
     * time.
     * @param timeout Timeout in milliseconds.
     * @return Created promise.
     */
    static delay(timeout: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => resolve(), Math.floor(timeout) || 0);
        });
    }
    
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
    static all<Value>(values: (ThenableOrValue<Value>)[]): Promise<Value[]> {
        if (!values.length) {
            return Promise.resolve([]);
        }
        
        let resultsPromise = new Promise<Value[]>();
        
        let results: Value[] = [];
        let remaining = values.length;
        
        let reasons: any[] = [];
        
        values.forEach((value, index) => {
            Promise
                .resolve(value)
                .then(result => {
                    results[index] = result;
                    checkCompletion();
                }, reason => {
                    reasons.push(reason);
                    checkCompletion();
                });
        });
        
        function checkCompletion(): void {
            remaining--;
            
            if (!remaining) {
                if (reasons.length) {
                    resultsPromise.reject(reasons[0]);
                } else {
                    resultsPromise.resolve(results);
                }
            }
        }
        
        return resultsPromise;
    }
    
    /**
     * A promise version of `Array.prototype.map`.
     * @param values Values to map.
     * @param callback Map callback.
     * @return Created promise.
     */
    static map<Value, Return>(values: Value[], callback: MapCallback<Value, Return>): Promise<Return[]> {
        return Promise.all(values.map(callback));
    }
    
    /**
     * (breakable) Iterate elements in an array one by one.
     * Return `false` or a promise that will eventually be fulfilled with
     * `false` to interrupt iteration.
     * @param values Values to iterate.
     * @param callback Each callback.
     * @return A promise that will be fulfiled with a boolean which
     *     indicates whether the iteration completed without interruption.
     */
    static each<Value>(values: Value[], callback: EachCallback<Value>): Promise<boolean> {
        return values
            .reduce((promise, value, index, values) => {
                return promise.then((result) => {
                    if (result === false) {
                        throw BREAK_SIGNAL;
                    }
                    
                    return callback(value, index, values);
                });
            }, Promise.resolve<boolean | void>(undefined))
            .then(() => true)
            .enclose()
            .then(completed => !!completed);
    }
    
    /**
     * (breakable) Pass the last result to the same callback with pre-set values.
     * @param values Pre-set values that will be passed to the callback one
     *     by one.
     * @param initialResult The initial result for the very first call.
     * @param callback Waterfall callback.
     */
    static waterfall<Value, Result>(values: Value[], initialResult: Result, callback: WaterfallCallback<Value, Result>): Promise<Result> {
        let lastResult = initialResult;
        
        return Promise
            .each(values, (value, index, array) => {
                let callbackPromise = Promise
                    .then(() => callback(value, lastResult, index, array))
                    .then(result => result);
                
                return callbackPromise
                    .enclose()
                    .then(result => {
                        if (callbackPromise.interrupted) {
                            return false;
                        } else {
                            lastResult = result;
                        }
                    });
            })
            .then(() => lastResult);
    }
    
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
    static retry<Return>(options: RetryOptions = {}, callback?: RetryCallback<Return>): Promise<Return> {
        if (
            callback === undefined &&
            typeof options === 'function'
        ) {
            callback = <any>options;
            options = {};
        }
        
        let {
            limit = 3,
            interval = 0
        } = options;
        
        let lastReason: any;
        let attemptIndex = 0;
        
        return process();
        
        function process(): Promise<Return> {
            return Promise
                .then(() => callback(lastReason, attemptIndex++))
                .enclose()
                .fail(reason => {
                    if (attemptIndex >= limit) {
                        throw reason;
                    }
                    
                    lastReason = reason;
                    
                    if (interval) {
                        return Promise
                            .delay(interval)
                            .then(() => process());
                    } else {
                        return process();
                    }
                });
        }
    }
    
    /**
     * Use a disposable resource and dispose it after been used.
     * @param disposable The disposable resource or a thenable of
     *     disposable resource.
     * @param handler Using handler.
     * @return Created promise.
     */
    static using<Resource, Return>(disposable: ThenableOrValue<Disposable<Resource>>, handler: OnFulfilledHandler<Resource, Return>): Promise<Return> {
        let resolvedDisposable: Disposable<Resource>;
        
        let promise = Promise
            .when(disposable)
            .then(disposable => {
                resolvedDisposable = disposable;
                return handler(disposable.resource);
            });
        
        let disposed = false;
        
        function dispose(): void {
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
    }
    
    /**
     * Invoke a Node style asynchronous function that accepts the last
     * argument as callback.
     * @param fn Node style asynchronous function.
     * @param args Arguments.
     * @return Created promise.
     */
    static invoke<Return>(fn: Function, ...args: any[]): Promise<Return> {
        return new Promise<Return>((resolve, reject) => {
            args = args.concat((error: any, value: Return) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(value);
                }
            });
            
            fn.apply(undefined, args);
        });
    }
    
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
    static get break(): void {
        throw BREAK_SIGNAL;
    }
    
    /** (get) The break signal. */
    static get breakSignal(): any {
        return BREAK_SIGNAL;
    }
    
    /** (get) The pre-break signal. */
    static get preBreakSignal(): any {
        return PRE_BREAK_SIGNAL;
    }
    
    /**
     * (get) A promise that has already been fulfilled with `undefined`.
     */
    static get void(): Promise<void> {
        let promise = new Promise<void>();
        promise.resolve(undefined);
        return promise;
    }
    
    /**
     * (get) A promise that has already been fulfilled with `true`.
     */
    static get true(): Promise<boolean> {
        let promise = new Promise<boolean>();
        promise.resolve(true);
        return promise;
    }
    
    /**
     * (get) A promise that has already been fulfilled with `false`.
     */
    static get false(): Promise<boolean> {
        let promise = new Promise<boolean>();
        promise.resolve(false);
        return promise;
    }
}

export default Promise;

//////////////////
// Promise Lock //
//////////////////

export type PromiseLockHandler<Return> = () => ThenableOrValue<Return>;

/**
 * Promise lock is a useful helper that can act as a simple task queue.
 */
export class PromiseLock {
    private _promise = Promise.void;

    /**
     * handler will be called once this promise lock is unlocked, and it
     * will be locked again until the value returned by handler is
     * fulfilled.
     * @param handler Promise lock handler.
     * @return Created promise, will be fulfilled once the return value of
     *     lock handler gets fulfilled.
     */
    lock<Return>(handler: PromiseLockHandler<Return>): Promise<Return> {
        let promise = this._promise.then(handler);
        this._promise = promise
            .fail(reason => undefined)
            .void;
        return promise;
    }
}

///////////
// Retry //
///////////

export type RetryCallback<Return> = (lastReason: any, attemptIndex: number) => ThenableOrValue<Return>;

export interface RetryOptions {
    /** Try limit times (defaults to 3). */
    limit?: number;
    /** Interval between two tries (defaults to 0). */
    interval?: number;
}

////////////////
// Disposable //
////////////////

export type Disposer<Resource> = (resource: Resource) => void;

export interface Disposable<Resource> {
    resource: Resource;
    dispose: Disposer<Resource>;
}

export const using: typeof Promise.using = Promise.using;
export const invoke: typeof Promise.invoke = Promise.invoke;
