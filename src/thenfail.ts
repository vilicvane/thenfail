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

export type ThenableOrValue<Value> = Promise<Value>|Thenable<Value>|Value;

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

export type OnRejectedHandler<Return> = (reason: any) => ThenableOrValue<Return>;

export type OnAnyHandler<Return> = (valueOrReason: any) => ThenableOrValue<Return>;

export type OnInterruptedHandler = () => void;

export type NodeStyleCallback<Value> = (error: any, value: Value) => void;

export type MapCallback<Value, Return> = (value: Value, index: number, array: Value[]) => ThenableOrValue<Return>;

export type EachCallback<Value> = (value: Value, index: number, array: Value[]) => ThenableOrValue<boolean|void>;

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
export const enum State {
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
    private _state = State.pending;
    private _running = false;
    private _valueOrReason: any;

    private _context: Context;

    /** 
     * Next promises in the chain.
     */
    private _chainedPromise: Promise<any>;
    private _chainedPromises: Promise<any>[];

    /** 
     * Promises that will share the same state (and value/reason).
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
    constructor(resolverOrContext?: Resolver<Value>|Context) {
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
     * The `then` method that follows Promises/A+ specifications <https://promisesaplus.com>.
     * To learn how to use promise, please check out <https://github.com/vilic/thenfail>.
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
     * Resolve this promise with a value or thenable.
     * @param value A normal value, or a promise/thenable.
     */
    resolve(value?: ThenableOrValue<Value>): void {
        this._unpack(value, (state, valueOrReason) => this._grab(state, valueOrReason));
    }
    
    /**
     * Reject this promise with a reason.
     */
    reject(reason: any): void {
        this._grab(State.rejected, reason);
    }
    
    /**
     * Add an interruption handler. This handler will only be invoked if previous
     * onfulfilled/onrejected handler has run and been interrupted.
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
     */
    enclose(): Promise<Value> {
        this._context._enclosed = true;
        return this;
    }
    
    /**
     * Delay a period of time (milliseconds).
     */
    delay(timeout: number): Promise<Value> {
        return this.then(value => {
            return new Promise<Value>(resolve => {
                setTimeout(() => resolve(value), Math.floor(timeout) || 0);
            });
        });
    }
    
    /**
     * Set a timeout of current promise context. This will enclose current promise context.
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
     * Handle another promise with the same state (and value/reason) of the current one.
     * @return Current promise.
     */
    handle(promise: Promise<Value>): Promise<Value>;
    handle(callback: NodeStyleCallback<Value>): Promise<Value>;
    handle(promiseOrCallback: Promise<Value>|NodeStyleCallback<Value>): Promise<Value> {
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
     * @param disposer 
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
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<Value>): Promise<Value> {
        return this.then<Value>(undefined, onrejected);
    }

    /**
     * Catch specific type of error if specified. Otherwise it the same like `promise.fail`.
     */
    catch(onrejected: OnRejectedHandler<Value>): Promise<Value>;
    catch(ErrorType: Function, onrejected: OnRejectedHandler<Value>): Promise<Value>;
    catch(ErrorType: Function|OnRejectedHandler<Value>, onrejected?: OnRejectedHandler<Value>): Promise<Value> {
        if (typeof onrejected === 'function') {
            return this.then<Value>(undefined, reason => {
                if (reason instanceof ErrorType) {
                    return onrejected(reason);
                } else {
                    throw reason;
                }
            });
        } else {
            onrejected = <OnRejectedHandler<Value>>ErrorType;
            return this.then<Value>(undefined, onrejected);
        }
    }
    
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of previous promise is a array.
     */
    map<Value>(callback: MapCallback<any, Value>): Promise<Value[]> {
        return this.then((values: any) => Promise.map(values, callback));
    }
    
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of previous promise is a array.
     */
    each<Value>(callback: EachCallback<Value>): Promise<boolean> {
        return this.then((values: any) => Promise.each(values, callback));
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
     * Log fulfilled value or rejected reason of current promise.
     * @return Current promise.
     */
    log(): Promise<Value>;
    /**
     * Log given value or rejected reason of current promise.
     * @return Current promise.
     */
    log(object: any): Promise<Value>;
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
     * Call `this.then` with `onrejected` handler only, and throw the rejection error if any.
     */
    done(): void {
        this.then(undefined, reason => {
            asap(() => {
                throw reason;
            });
        });
    }
    
    /**
     * (get) A shortcut of `promise.then(() => { Promise.break; })`.
     * See https://github.com/vilic/thenfail# for more information.
     */
    get break(): Promise<any> {
        return this.then(() => {
            throw PRE_BREAK_SIGNAL;
        });
    }
    
    /**
     * (get) A promise that will eventually been fulfilled with value `undefined`.
     */
    get void(): Promise<void> {
        return this.then(() => undefined);
    }
    
    /**
     * (get) A promise that will eventually been fulfilled with value `true`.
     */
    get true(): Promise<boolean> {
        return this.then(() => true);
    }
    
    /**
     * (get) A promise that will eventually been fulfilled with value `false`.
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
     * (get) A boolean that indicates whether the current promise is pending.
     */
    get pending(): boolean {
        return this._state === State.pending;
    }
    
    /**
     * (get) A boolean that indicates whether the current promise is fulfilled.
     */
    get fulfilled(): boolean {
        return this._state === State.fulfilled;
    }
    
    /**
     * (get) A boolean that indicates whether the current promise is rejected.
     */
    get rejected(): boolean {
        return this._state === State.rejected;
    }
    
    /**
     * (get) A boolean that indicates whether the current promise is interrupted.
     */
    get interrupted(): boolean {
        return this._state === State.interrupted;
    }
    
    // Static helpers
    
    /**
     * A shortcut of `Promise.void.then(onfulfilled)`.
     */
    static then<Value>(onfulfilled: OnFulfilledHandler<void, Value>): Promise<Value> {
        return Promise.void.then(onfulfilled);
    }
    
    /**
     * A shortcut of `Promise.then(() => value)`.
     * @return Return the value itself if it's an instanceof ThenFail Promise.
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
     * A shortcut of `Promise.then(() => { throw reason; })`.
     */
    static reject(reason: any): Promise<void>;
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
     * Create a promise under given context.
     */
    static context(context: Context): Promise<void> {
        let promise = new Promise<void>(context);
        promise.resolve();
        return promise;
    }
    
    /**
     * Delay a period of time (milliseconds).
     */
    static delay(timeout: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => resolve(), Math.floor(timeout) || 0);
        });
    }
    
    /**
     * Create a promise that will be fulfilled:
     *  1. when all values are fulfilled.
     *  2. with the value of an array of fulfilled values.
     * And will be rejected:
     *  1. if any of the values is rejected.
     *  2. with the reason of the first rejection as its reason.
     *  3. after all values are either fulfilled or rejected.
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
     * A promise version of `array.map`.
     */
    static map<Value, Return>(values: Value[], callback: MapCallback<Value, Return>): Promise<Return[]> {
        return Promise.all(values.map(callback));
    }
    
    /**
     * Iterate elements in an array one by one.
     * Return `false` or a promise that will eventually be fulfilled with `false` to interrupt iteration.
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
            }, Promise.resolve<boolean|void>(undefined))
            .then(() => true)
            .enclose()
            .then(completed => !!completed);
    }
    
    /**
     * Pass the last result to the same callback on and on.
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
     * Try a process for several times.
     */
    static retry<Return>(callback: RetryCallback<Return>): Promise<Return>;
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
    */
    static using<Resource, Return>(disposable: Thenable<Disposable<Resource>>|Disposable<Resource>, handler: OnFulfilledHandler<Resource, Return>): Promise<Return> {
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
     * Invoke a Node style function that accepts the last argument as callback.
     */
    static invoke<Value>(fn: Function, ...args: any[]): Promise<Value> {
        return new Promise<Value>((resolve, reject) => {
            args = args.concat((error: any, value: Value) => {
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
     * (get) A promise that has already been fulfilled with value `undefined`.
     */
    static get void(): Promise<void> {
        let promise = new Promise<void>();
        promise.resolve(undefined);
        return promise;
    }
    
    /**
     * (get) A promise that has already been fulfilled with value `true`.
     */
    static get true(): Promise<boolean> {
        let promise = new Promise<boolean>();
        promise.resolve(true);
        return promise;
    }
    
    /**
     * (get) A promise that has already been fulfilled with value `false`.
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

export class PromiseLock {
    private _promise = Promise.void;

    /**
     * handler will be called once this promise lock is unlocked, and it will be
     * locked again until the value returned by handler is fulfilled.
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
