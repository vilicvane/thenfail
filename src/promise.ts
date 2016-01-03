/**
 * ThenFail v0.4
 * Just another Promises/A+ Library
 * 
 * https://github.com/vilic/thenfail
 * 
 * MIT License
 */

import * as asap from 'asap';
import deprecated from 'deprecated-decorator';

import { BreakSignal, GoToSignal } from './signals';
import { Context } from './context';
import { TimeoutError } from './errors';

/////////////
// Promise //
/////////////

export interface PromiseLike<T> {
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @return A Promise for the completion of which ever callback is executed.
     */
    then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => TResult | PromiseLike<TResult>): PromiseLike<TResult>;
    then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>, onrejected?: (reason: any) => void): PromiseLike<TResult>;
}

export type Resolvable<T> = PromiseLike<T> | T;

export type Resolver<T> = (
    resolve: (value?: Resolvable<T>) => void,
    reject: (reason: any) => void
) => void;

export type OnFulfilledHandler<T, TResult> = (value: T) => Resolvable<TResult>;

export type OnFulfilledSpreadHandler<TResult> = (...values: any[]) => Resolvable<TResult>;

export type OnRejectedHandler<TResult> = (reason: any) => Resolvable<TResult>;

export type OnAnyHandler<TResult> = (valueOrReason: any) => Resolvable<TResult>;

export type OnContextDisposedHandler = () => void;

export type NodeStyleCallback<T> = (error?: any, value?: T) => void;

export type MapCallback<T, TResult> = (value: T, index: number, array: T[]) => Resolvable<TResult>;

export type EachCallback<T> = (value: T, index: number, array: T[]) => Resolvable<boolean | void>;

export type WaterfallCallback<T, TResult> = (value: T, result: TResult, index: number, array: T[]) => Resolvable<TResult>;

/**
 * Possible states of a promise.
 */
const enum State {
    pending,
    fulfilled,
    rejected,
    skipped
}

/**
 * ThenFail promise options.
 */
export let options = {
    disableUnrelayedRejectionWarning: false,
    logger: {
        log: console.log,
        warn: console.warn,
        error: console.error
    }
};

// The core abstraction of this implementation is to imagine the behavior of promises
// as relay runners.
//  1. Grab the baton state (and value/reason).
//  2. Run and get its own state.
//  3. Relay the new state to next runners.

export class Promise<T> implements PromiseLike<T> {
    /** Current state of this promise. */
    private _state = State.pending;
    
    /**
     * Indicates whether `onfulfilled` or `onrejected` handler has been called
     * but the resolved value has not become fulfilled yet.
     */
    private _running = false;
    
    /** Indicates whether this promise has been relayed or notified as unrelayed. */
    private _handled = false;
    
    /** The fulfilled value or rejected reason associated with this promise. */
    private _valueOrReason: any;
    
    /** Context of this promise. */
    private _context: Context;
    
    /** Label of this promise. */
    private _label: string;

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
    private _handledPromise: Promise<T>;
    /** Promises that will share the same state (and value/reason). */
    private _handledPromises: Promise<T>[];
    
    private _onPreviousFulfilled: OnFulfilledHandler<any, T>;
    private _onPreviousRejected: OnRejectedHandler<T>;
    private _onContextDisposed: OnContextDisposedHandler;

    /**
     * Promise constructor.
     */
    constructor();
    constructor(resolver: Resolver<T>);
    constructor(context: Context);
    constructor(resolverOrContext?: Resolver<T> | Context) {
        if (resolverOrContext instanceof Context && !resolverOrContext._enclosed) {
            this._context = resolverOrContext;
        } else {
            this._context = new Context();
        }
        
        if (typeof resolverOrContext === 'function') {
            try {
                (<Resolver<T>>resolverOrContext)(
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
        
        let handler: OnAnyHandler<Resolvable<T>>;
        
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
            let resolvable: Resolvable<T>;

            try {
                resolvable = handler(previousValueOrReason);
            } catch (error) {
                this._decide(State.rejected, error);
                this._running = false;
                return;
            }

            this._unpack(resolvable, (state, valueOrReason) => {
                this._decide(state, valueOrReason);
                this._running = false;
            });
        });
    }
    
    /**
     * The resolve process defined in Promises/A+ specifications.
     */
    private _unpack(value: Resolvable<T>, callback: (state: State, valueOrReason: any) => void): void {
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
                value._handled = true;
            }
        } else if (value) {
            switch (typeof value) {
                case 'object':
                case 'function':
                    try {
                        let then = (value as PromiseLike<any>).then;

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
     * Decide whether to call `_relay`, `_skip` or `_goto`.
     */
    private _decide(state: State, valueOrReason?: any): void {
        if (valueOrReason instanceof BreakSignal) {
            this._skip(valueOrReason);
        } else if (valueOrReason instanceof GoToSignal) {
            this._goto(valueOrReason);
        } else {
            this._relay(state, valueOrReason);
        }
    }
    
    /**
     * Set the state of current promise and relay it to next promises.
     */
    private _relay(state: State, valueOrReason?: any): void {
        if (this._state !== State.pending) {
            return;
        }
        
        if (this._context._disposed) {
            this._skip();
            return;
        }
        
        this._state = state;
        this._valueOrReason = valueOrReason;
        
        if (this._chainedPromise) {
            this._chainedPromise._grab(state, valueOrReason);
        } else if (this._chainedPromises) {
            for (let promise of this._chainedPromises) {
                promise._grab(state, valueOrReason);
            }
        }
        
        if (this._handledPromise) {
            this._handledPromise._relay(state, valueOrReason);
        } else if (this._handledPromises) {
            for (let promise of this._handledPromises) {
                promise._relay(state, valueOrReason);
            }
        }
        
        asap(() => {
            if (state === State.rejected && !this._handled) {
                this._handled = true;
                
                let relayed = !!(this._chainedPromise || this._chainedPromises || this._handledPromise || this._handledPromises);
                
                if (!relayed && !options.disableUnrelayedRejectionWarning) {
                    let error = valueOrReason && (valueOrReason.stack || valueOrReason.message) || valueOrReason;
                    options.logger.warn(`An unrelayed rejection happens:\n${error}`);
                }
            }
            
            this._relax();
        });
    }
    
    /**
     * Skip some promises.
     */
    private _skip(signal?: BreakSignal): void {
        if (this._state !== State.pending) {
            return;
        }
        
        if (this._running) {
            // if it's disposed.
            if (!signal) {
                if (this._onContextDisposed) {
                    try {
                        this._onContextDisposed.call(undefined);
                    } catch (error) {
                        asap(() => {
                            throw error;
                        });
                    }
                }
            }
            
            this._state = State.fulfilled;
        } else {
            this._state = State.skipped;
        }
        
        if (this._chainedPromise) {
            let promise = this._chainedPromise;
            
            if (promise._context === this._context) {
                promise._skip(signal);
            } else {
                promise._grab(State.fulfilled);
            }
        } else if (this._chainedPromises) {
            for (let promise of this._chainedPromises) {
                if (promise._context === this._context) {
                    promise._skip(signal);
                } else {
                    promise._grab(State.fulfilled);
                }
            }
        }
        
        if (signal && signal.preliminary) {
            signal.preliminary = false;
            
            if (this._handledPromise) {
                this._handledPromise._skip(signal);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._skip(signal);
                }
            }
        } else {
            if (this._handledPromise) {
                this._handledPromise._relay(State.fulfilled);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._relay(State.fulfilled);
                }
            }
        }
        
        this._relax();
    }
    
    /**
     * Go to a specific promise that matches given label.
     */
    private _goto(signal: GoToSignal): void {
        if (this._state !== State.pending) {
            return;
        }
        
        this._state = this._running ? State.fulfilled : State.skipped;
        
        if (this._chainedPromise) {
            let promise = this._chainedPromise;
            
            if (promise._label === signal.label) {
                promise._grab(State.fulfilled, signal.value);
            } else {
                promise._goto(signal);
            }
        } else if (this._chainedPromises) {
            for (let promise of this._chainedPromises) {
                if (promise._label === signal.label) {
                    promise._grab(State.fulfilled, signal.value);
                } else {
                    promise._goto(signal);
                }
            }
        }
        
        if (signal && signal.preliminary) {
            signal.preliminary = false;
            
            if (this._handledPromise) {
                this._handledPromise._goto(signal);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._goto(signal);
                }
            }
        } else {
            if (this._handledPromise) {
                this._handledPromise._relay(State.fulfilled);
            } else if (this._handledPromises) {
                for (let promise of this._handledPromises) {
                    promise._relay(State.fulfilled);
                }
            }
        }
        
        this._relax();
    }
    
    /**
     * Set handlers to undefined.
     */
    private _relax(): void {
        if (this._onPreviousFulfilled) {
            this._onPreviousFulfilled = undefined;
        }
        
        if (this._onPreviousRejected) {
            this._onPreviousRejected = undefined;
        }
        
        if (this._onContextDisposed) {
            this._onContextDisposed = undefined;
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
    }
    
    /**
     * The `then` method that follows
     * [Promises/A+ specifications](https://promisesaplus.com).
     * @param onfulfilled Fulfillment handler.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    then<TResult>(onfulfilled: OnFulfilledHandler<T, TResult>, onrejected?: OnRejectedHandler<TResult>): Promise<TResult> {
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
            if (!this._handled) {
                this._handled = true;
            }
            
            promise._grab(this._state, this._valueOrReason);
        }
        
        return promise;
    }
    
    /**
     * Resolve the promise with a value or thenable.
     * @param resolvable The value to fulfill or thenable to resolve.
     */
    resolve(resolvable?: Resolvable<T>): void {
        this._unpack(resolvable, (state, valueOrReason) => this._grab(state, valueOrReason));
    }
    
    /**
     * Reject this promise with a reason.
     * @param reason Rejection reason.
     */
    reject(reason: any): void {
        this._grab(State.rejected, reason);
    }
    
    /**
     * Like `then` but accepts the first extra parameter as the label of
     * current part.
     * @param label Part label.
     * @param onfulfilled Fulfillment handler.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    label<TResult>(label: string, onfulfilled: OnFulfilledHandler<T, TResult>, onrejected?: OnRejectedHandler<TResult>): Promise<TResult> {
        let promise = this.then(onfulfilled, onrejected);
        promise._label = label;
        return promise;
    }
    
    /**
     * Set up the interruption handler of the promise.
     * An interruption handler will be called if either the `onfulfilled`
     * or `onrejected` handler of the promise has been called but
     * interrupted due to context disposal.
     * (by break signal or the canceling of the context).
     * @param oninerrupted Interruption handler.
     * @return Current promise.
     */
    interruption(oncontextdisposed: OnContextDisposedHandler): Promise<T> {
        if (this._state === State.pending) {
            if (this._onContextDisposed) {
                throw new Error('Interruption handler has already been set');
            }
            
            this._onContextDisposed = oncontextdisposed;
        } else {
            // To unify error handling behavior, handler would not be invoked
            // if it's added after promise state being no longer pending.
            options.logger.warn('Handler added after promise state no longer being pending');
        }
        
        return this;
    }
    
    /**
     * Enclose current promise context.
     * @return Current promise.
     */
    enclose(): Promise<T> {
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
    delay(timeout: number): Promise<T> {
        return this.then(value => {
            return new Promise<T>(resolve => {
                setTimeout(() => resolve(value), Math.floor(timeout) || 0);
            });
        });
    }
    
    /**
     * Reject the promise with `TimeoutError` if it's still pending after
     * timeout. The timer starts once this method is called
     * (usually before the fulfillment of previous promise).
     * @param timeout Timeout in milliseconds.
     * @return Current promise.
     */
    timeout(timeout: number, message?: string): Promise<T> {
        this._context._enclosed = true;
        
        setTimeout(() => {
            if (this._state === State.pending) {
                this._relay(State.rejected, new TimeoutError(message));
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
    handle(promise: Promise<T>): Promise<T>;
    /**
     * @param callback Node style callback.
     * @return Current promise.
     */
    handle(callback: NodeStyleCallback<T>): Promise<T>;
    handle(promiseOrCallback: Promise<T> | NodeStyleCallback<T>): Promise<T> {
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
                if (!this._handled) {
                    this._handled = true;
                }
            
                promiseOrCallback._relay(this._state, this._valueOrReason);
            }
        } else if (typeof promiseOrCallback === 'function') {
            this.then(
                value => {
                    (promiseOrCallback as NodeStyleCallback<T>)(undefined, value);
                },
                reason => {
                    (promiseOrCallback as NodeStyleCallback<T>)(reason, undefined)
                }
            );
        } else {
            throw new TypeError('Unsupported type to handle');
        }
        
        return this;
    }
    
    /**
     * Create a disposable resource promise.
     * @param disposor A synchronous function to handle resource disposing.
     * @return Created disposable resource promise.
     */
    disposable(disposer: Disposer<T>): Promise<Disposable<T>> {
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
    tap(onfulfilled: OnFulfilledHandler<T, void>): Promise<T> {
        let relayValue: T;
        
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
    spread<TResult>(onfulfilled: OnFulfilledSpreadHandler<TResult>): Promise<TResult> {
        return this.then(value => onfulfilled.apply(undefined, value));
    }

    /**
     * A shortcut of `promise.then(undefined, onrejected)`.
     */
    fail(onrejected: OnRejectedHandler<T>): Promise<T> {
        return this.then<T>(undefined, onrejected);
    }

    /**
     * Like `fail` but can specify type of reason to catch.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    catch(onrejected: OnRejectedHandler<T>): Promise<T>;
    /**
     * @param ReasonType Type of reasons to catch.
     * @param onrejected Rejection handler.
     * @return Created promise.
     */
    catch(ReasonType: Function, onrejected: OnRejectedHandler<T>): Promise<T>;
    catch(ReasonType: Function | OnRejectedHandler<T>, onrejected?: OnRejectedHandler<T>): Promise<T> {
        if (typeof onrejected === 'function') {
            return this.then<T>(undefined, reason => {
                if (reason instanceof ReasonType) {
                    return onrejected(reason);
                } else {
                    throw reason;
                }
            });
        } else {
            onrejected = ReasonType as OnRejectedHandler<T>;
            return this.then<T>(undefined, onrejected);
        }
    }
    
    /**
     * A shortcut of `Promise.map`, assuming the fulfilled value of 
     * previous promise is a array.
     * @param callback Map callback.
     * @return Created promise.
     */
    map<T>(callback: MapCallback<any, T>): Promise<T[]> {
        return this.then((values: any) => Promise.map(values, callback));
    }
    
    /**
     * A shortcut of `Promise.each`, assuming the fulfilled value of
     * previous promise is a array.
     * @param callback Each callback.
     * @return Created promise.
     */
    each<T>(callback: EachCallback<T>): Promise<boolean> {
        return this.then((values: any) => Promise.each(values, callback));
    }
    
    /**
     * A shortcut of `Promise.waterfall`, take the fulfilled value of
     * previous promise as initial result.
     */
    waterfall<TValue>(values: TValue[], callback: WaterfallCallback<TValue, T>): Promise<T> {
        return this.then(initialResult => Promise.waterfall(values, initialResult, callback));
    }
    
    /**
     * A shortcut of `Promise.retry`.
     */
    retry<TResult>(callback: RetryCallback<TResult>): Promise<TResult>;
    retry<TResult>(options: RetryOptions, callback: RetryCallback<TResult>): Promise<TResult>;
    retry<TResult>(options: RetryOptions, callback?: RetryCallback<TResult>): Promise<TResult> {
        return this.then(() => Promise.retry(options, callback));
    }
    
    /**
     * Log the value specified on fulfillment, or if not, the fulfilled value or
     * rejection reason of current promise after the previous promise becomes settled.
     * @param object Specified value to log.
     * @return Created promise.
     */
    log(object?: any): Promise<T> {
        if (object === undefined) {
            return this.then(value => {
                if (value !== undefined) {
                    options.logger.log(value);
                }
                
                return value;
            }, reason => {
                options.logger.error(reason && (reason.stack || reason.message) || reason);
                return undefined;
            });
        } else {
            return this.tap(() => {
                options.logger.log(object);
            });
        }
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
     * (get) A promise that will be rejected with a pre-break signal if previous
     * promise is fulfilled with a non-`false` value.
     */
    get break(): Promise<any> {
        return this.then(value => {
            if (<any>value !== false) {
                throw new BreakSignal(true);
            }
        });
    }
    
    /**
     * Create a promise that will be rejected with a goto signal if previous
     * promise is fulfilled with a non-`false` value.
     */
    goto(label: string, value?: any): Promise<any> {
        return this.then(value => {
            if (<any>value !== false) {
                throw new GoToSignal(label, value, true);
            }
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
    get skipped(): boolean {
        return this._state === State.skipped;
    }
    
    /**
     * @deperacated
     * (get) A boolean that indicates whether the promise is interrupted.
     */
    @deprecated('skipped', '0.4')
    get interrupted(): boolean {
        return this._state === State.skipped;
    }
    
    // Static helpers
    
    /**
     * A shortcut of `Promise.void.then(onfulfilled)`.
     * @param onfulfilled Fulfillment handler.
     * @return Created promise.
     */
    static then<TResult>(onfulfilled: OnFulfilledHandler<void, TResult>): Promise<TResult> {
        return Promise.void.then(onfulfilled);
    }
    
    /**
     * Resolve a value or thenable as a promise.
     * @return The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve(): Promise<void>;
    /**
     * @return The value itself if it's a ThenFail Promise,
     *     otherwise the created promise.
     */
    static resolve<T>(resolvable: Resolvable<T>): Promise<T>;
    static resolve<T>(resolvable?: Resolvable<T>): Promise<T> {
        if (resolvable instanceof Promise) {
            return resolvable;
        } else {
            let promise = new Promise<T>();
            promise.resolve(resolvable);
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
    static reject<T>(reason: any): Promise<T>;
    static reject<T>(reason: any): Promise<T> {
        let promise = new Promise<T>();
        promise.reject(reason);
        return promise;
    }
    
    /**
     * Alias of `Promise.resolve`.
     */
    static when<T>(value: Resolvable<T>): Promise<T> {
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
     * @return Created promise.
     */
    static all<T>(resolvables: Resolvable<T>[]): Promise<T[]> {
        if (!resolvables.length) {
            return Promise.resolve([]);
        }
        
        let resultsPromise = new Promise<T[]>();
        
        let results: T[] = [];
        let remaining = resolvables.length;
        
        let reasons: any[] = [];
        
        resolvables.forEach((resolvable, index) => {
            Promise
                .resolve(resolvable)
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
     * Create a promise that is settled the same way as the first passed promise to settle.
     * It resolves or rejects, whichever happens first.
     * @param resolvables Promises or values to race.
     * @return Created promise. 
     */
    static race<TResult>(resolvables: Resolvable<TResult>[]): Promise<TResult> {
        let promise = new Promise<TResult>();
        
        for (let resolvable of resolvables) {
            Promise
                .resolve(resolvable)
                .handle(promise);
        }
        
        return promise;
    }
    
    /**
     * A promise version of `Array.prototype.map`.
     * @param values Values to map.
     * @param callback Map callback.
     * @return Created promise.
     */
    static map<T, TResult>(values: T[], callback: MapCallback<T, TResult>): Promise<TResult[]> {
        return Promise.all(values.map(callback));
    }
    
    /**
     * (breakable) Iterate elements in an array one by one.
     * TResult `false` or a promise that will eventually be fulfilled with
     * `false` to interrupt iteration.
     * @param values Values to iterate.
     * @param callback Each callback.
     * @return A promise that will be fulfiled with a boolean which
     *     indicates whether the iteration completed without interruption.
     */
    static each<T>(values: T[], callback: EachCallback<T>): Promise<boolean> {
        return values
            .reduce((promise, value, index, values) => {
                return promise.then((result) => {
                    if (result === false) {
                        throw new BreakSignal();
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
    static waterfall<T, TResult>(values: T[], initialResult: TResult, callback: WaterfallCallback<T, TResult>): Promise<TResult> {
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
    static retry<TResult>(callback: RetryCallback<TResult>): Promise<TResult>;
    /**
     * @param options Retry options.
     * @param callback Retry callback.
     * @return Created promise.
     */
    static retry<TResult>(options: RetryOptions, callback: RetryCallback<TResult>): Promise<TResult>;
    static retry<TResult>(options: RetryOptions = {}, callback?: RetryCallback<TResult>): Promise<TResult> {
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
        
        function process(): Promise<TResult> {
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
    static using<T, TResult>(disposable: Resolvable<Disposable<T>>, handler: OnFulfilledHandler<T, TResult>): Promise<TResult> {
        let resolvedDisposable: Disposable<T>;
        
        let promise = Promise
            .resolve(disposable)
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
    static invoke<TResult>(fn: Function, ...args: any[]): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            args = args.concat((error: any, value: TResult) => {
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
    static get break(): void {
        throw new BreakSignal();
    }
    
    /** (get) The break signal. */
    static get breakSignal(): any {
        return new BreakSignal();
    }
    
    /** (get) The pre-break signal. */
    static get preBreakSignal(): any {
        return new BreakSignal(true);
    }
    
    /** (fake statement) This method will throw an `GoToSignal` with specified `label`. */
    static goto(label: string, value?: any): void {
        throw new GoToSignal(label, value);
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

///////////
// Retry //
///////////

export type RetryCallback<TResult> = (lastReason: any, attemptIndex: number) => Resolvable<TResult>;

export interface RetryOptions {
    /** Try limit times (defaults to 3). */
    limit?: number;
    /** Interval between two tries (defaults to 0). */
    interval?: number;
}

////////////////
// Disposable //
////////////////

export type Disposer<TResource> = (resource: TResource) => void;

export interface Disposable<TResource> {
    resource: TResource;
    dispose: Disposer<TResource>;
}

export const using: typeof Promise.using = Promise.using;
export const invoke: typeof Promise.invoke = Promise.invoke;
