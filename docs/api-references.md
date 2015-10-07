# ThenFail v0.3 API References

## Notable basics

### States

Promises/A+ defines 3 states of a promise: _pending_, _fulfilled_ and _rejected_. And only the _pending_ state may transform to other states.

In the implementation of ThenFail, one more state _interrupted_ is added to specify the state of promises interrupted by (fake) `break` or a canceled context (However, the promise of which `onfulfilled` or `onrejected` has been called will not be _interrupted_).

### Resolve

_Resolve_ is a process that may change the state of promise from _pending_ to either _fulfilled_ or _rejected_ (not just the former state).

## Terms

### Promise

A _promise_ in the references means the implementation of Promises/A+ in ThenFail.

### Thenable

A _thenable_ in the references means any other implementation that might act somewhat or exactly as we may expect a Promises/A or Promises/A+ implementation will.

## Classes

### Promise<Value>

The Promises/A+ implementation with many useful helpers.

#### Constructor

```ts
constructor();
constructor(resolver: Resolver<Value>);
constructor(context: Context);
```

#### Methods

##### Promise#then()

The `then` method that follows [Promises/A+ specifications](https://promisesaplus.com).

```ts
then<Return>(
    onfulfilled: (value: Value) => Return,
    onrejected?: (reason: any) => Return
): Promise<Return>;
```

- **onfulfilled:** Fulfillment handler.
- **onrejected:** Rejection handler.
- **return:** Created promise.

If `onfulfilled` handler is provided (and it's a function), the promise created by this `then` call will have value of type based on the return type of the handler.

```ts
then(
    onfulfilled: void,
    onrejected: (reason: any) => Return
): Promise<Value>;
```

- **onfulfilled:** Fulfillment handler.
- **onrejected:** Rejection handler.
- **return:** Created promise.

If `onfulfilled` handler is `undefined` or `null`, the promise created by this `then` call will have value of type (actually the exact value) of previous promise.

##### Promise#resolve()

Resolve the promise with a value or thenable.

```ts
resolve(value?: Thenable<Value> | Value): void;
```

- **value:** The value to fulfill or thenable to resolve.

##### Promise#reject()

Reject the promise with a reason.

```ts
reject(reason: any): void;
```

- **reason:** Rejection reason.

##### Promise#interruption()

Set up the interruption handler of the promise. An interruption handler will be called if either the `onfulfilled` or `onrejected` handler of the promise has been called but interrupted for some reason (by break signal or the canceling of the context).

```ts
interruption(oninterrupted: () => void): this;
```

- **oninterrupted:** Interruption handler.
- **return:** Current promise.

##### Promise#enclose()

Enclose current [promise context](#).

```ts
enclose(): this;
```

- **return:** Current promise.

##### Promise#delay()

Create a promise that will be fulfilled in given time after its previous promise becomes fulfilled. The fulfilled value will be relayed.

```ts
delay(timeout: number): this;
```

- **timeout:** Timeout in milliseconds.
- **return:** Created promise.

##### Promise#timeout()

Reject the promise with `TimeoutError` if it's still pending after timeout. The timer starts once this method is called (usually before the fulfillment of previous promise).

```ts
timeout(timeout: number): this;
```

- **timeout:** Timeout in milliseconds.
- **return:** Created promise.

##### Promise#handle()

Handle another promise or node style callback with the value or reason of current promise.

```ts
handle(promise: Promise<Value>): this;
```

- **promise:** Another ThenFail promise with the same type as current promise.
- **return:** Current promise.

```ts
handle(callback: (error: any, value: Value) => void): this;
```

- **callback:** Node style callback.
- **return:** Current promise.

##### Promise#disposable()

Create a [disposable](#) resource promise.

```ts
disposable(disposer: (resource: Resource) => void): Promise<Disposable<Value>>;
```

- **disposer:** A synchronous function to handle resource disposing.
- **return:** Created disposable resource promise.

##### Promise#tap()

Like `then` with only an `onfulfilled` handler, but will relay the previous fulfilled value instead of value returned by its own `onfulfilled`.

```ts
tap(onfulfilled: (value: Value) => Thenable<void> | void): Promise<Value>;
```

- **onfulfilled:** Fulfillment handler.
- **return:** Created promise.

##### Promise#fail()

A shortcut of `promise.then(undefined, onrejected)`.

```ts
fail(onrejected: (reason: any) => Thenable<void> | void): Promise<Value>;
```

- **onrejected:** Rejection handler.
- **return:** Created promise.

##### Promise#catch()

Like `fail` but can specify type of reasons to catch.

```ts
catch(onrejected: (reason: any) => Thenable<void> | void): Promise<Value>;
```

- **onrejected:** Rejection handler.
- **return:** Created promise.

Equivalent to `fail`.

```ts
catch(
    ReasonType: Function,
    onrejected: (reason: any) => Thenable<void> | void
): Promise<Value>;
```

- **ReasonType:** Type of reasons to catch.
- **onrejected:** Rejection handler.
- **return:** Created promise.

Catch a reason only if `reason instanceof ReasonType` is `true`. Otherwise it will rethrow the reason to pass it on.

##### Promise#map()

A shortcut of `Promise.map`, assuming the fulfilled value of previous promise is a array.

```ts
map<Value>(callback: (value: Value, index: number, array: Value[]) => Thenable<Return> | Return): Promise<Value[]>;
```

- **callback:** Map callback.
- **return:** Created promise.

##### Promise#each()

A shortcut of `Promise.each`, assuming the fulfilled value of previous promise is a array.

```ts
each<Value>(callback: (value: Value, index: number, array: Value[]) => Thenable<boolean | void> | boolean | void): Promise<boolean>;
```

- **callback:** Each callback.
- **return:** Created promise.

##### Promise#waterfall()

A shortcut of `Promise.waterfall`, take the fulfilled value of previous promise as initial result.

```ts
waterfall<ViaValue>(
    values: ViaValue[],
    callback: (value: ViaValue, result: Value, index: number, array: ViaValue[]) => Thenable<Value> | Value
): Promise<Value>;
```

- **values:** Via values.
- **callback:** Waterfall callback.
- **return:** Created promise.

##### Promise#retry()

A shortcut of `Promise.retry`.

```ts
retry<Return>(callback: (lastReason: any, attemptIndex: number) => Thenable<Return> | Return): Promise<Return>;
retry<Return>(
    options: {
        limits?: number;
        interval?: number;
    },
    callback: (lastReason: any, attemptIndex: number) => Thenable<Return> | Return
): Promise<Return>;
```

##### Promise#log()

Log the value specified or if not, the fulfilled value or rejection reason of current promise after the previous promise becomes settled.

```ts
log(object?: any): this;
```

- **object:** Specified value to log.
- **return:** Current promise.

##### Promise#done()

Call `then` with `onrejected` handler only, and throw the rejection reason (asynchronously) if any.

```ts
done(): void;
```

#### Properties

##### Promise#break

(get) A promise that will be rejected with a pre-break signal.

```ts
get break(): Promise<any>;
```

##### Promise#void

(get) A promise that will eventually be fulfilled with `undefined`.

```ts
get void(): Promise<void>;
```

##### Promise#true

(get) A promise that will eventually been fulfilled with `true`.

```ts
get true(): Promise<boolean>;
```

##### Promise#false

(get) A promise that will eventually been fulfilled with `false`.

```ts
get false(): Promise<boolean>;
```

##### Promise#context

(get) Get the context of current promise.

```ts
get context(): Context;
```

##### Promise#pending

(get) A boolean that indicates whether the promise is pending.

```ts
get pending(): boolean;
```

##### Promise#fulfilled

(get) A boolean that indicates whether the promise is fulfilled.

```ts
get fulfilled(): boolean;
```

##### Promise#rejected

(get) A boolean that indicates whether the promise is rejected.

```ts
get rejected(): boolean;
```

##### Promise#interrupted

(get) A boolean that indicates whether the promise is interrupted.

```ts
get interrupted(): boolean;
```

#### Static methods

##### Promise.then()

A shortcut of `Promise.void.then(onfulfilled)`.

```ts
static then<Value>(onfulfilled: () => Thenable<Value> | Value): Promise<Value>;
```

##### Promise.resolve()

Resolve a value or thenable as a promise.

```ts
static resolve<Value>(value: Thenable<Value> | Value): Promise<Value>;
```

- **value:** The value or thenable to resolve.
- **return:** The value itself if it's a ThenFail Promise, otherwise the created promise.

##### Promise.reject()

Create a promise rejected by specified reason.

```ts
static reject(reason: any): Promise<void>;
static reject<Value>(reason: any): Promise<Value>;
```

- **reason:** Rejection reason.
- **return:** Created promise.

##### Promise.when()

Alias of `Promise.resolve`.

```ts
static when<Value>(value: Thenable<Value> | Value): Promise<Value>
```

##### Promise.context()

Create a promise with given context.

```ts
static context(context: Context): Promise<void>;
```

- **context:** Promise context.
- **return:** Created promise.

##### Promise.delay()

Create a promise that will be fulfilled with `undefined` in given time.

```ts
static delay(timeout: number): Promise<void>;
```

- **timeout:** Timeout in milliseconds.
- **return:** Created promise.

##### Promise.all()

Create a promise that will be fulfilled:

  1. when all values are fulfilled.
  2. with the value of an array of fulfilled values.

And will be rejected:

  1. if any of the values is rejected.
  2. with the reason of the first rejection as its reason.
  3. after all values are either fulfilled or rejected.

```ts
static all<Value>(values: (Thenable<Value> | Value)[]): Promise<Value[]>;
```

- **values:** Values or thenables.
- **return:** Created promise.

##### Promise.map()

A promise version of `Array.prototype.map`.

```ts
static map<Value, Return>(
    values: Value[],
    callback: (value: Value, index: number, array: Value[]) => Thenable<Return> | Return
): Promise<Return[]>;
```

- **values:** Values to map.
- **callback:** Map callback
- **return:** Created promise.

##### Promise.each()

(breakable) Iterate elements in an array one by one. Return `false` or a promise that will eventually be fulfilled with `false` to interrupt iteration.

```ts
static each<Value>(
    values: Value[],
    (value: Value, index: number, array: Value[]) => Thenable<boolean | void> | boolean | void
): Promise<boolean>;
```

- **values:** Values to iterate.
- **callback:** Each callback.
- **return:** A promise that will be fulfiled with a boolean which indicates whether the iteration completed without interruption.

##### Promise.waterfall()

(breakable) Pass the last result to the same callback with pre-set values.

```ts
static waterfall<Value, Result>(
    values: Value[],
    initialResult: Result,
    callback: (value: Value, result: Result, index: number, array: Value[]) => Thenable<Result> | Result
): Promise<Result>;
```

- **values:** Pre-set values that will be passed to the callback one by one.
- **initialResult:** The initial result for the very first call.
- **callback:** Waterfall callback.
- **return:** Created promise.

##### Promise.retry()

Retry the process in the callback for several times.

```ts
static retry<Return>(callback: (lastReason: any, attemptIndex: number) => Thenable<Return> | Return): Promise<Return>;
```

- **callback:** Retry callback.
- **return:** Created promise.

```ts
static retry<Return>(
    options: {
        limits?: number;
        interval?: number;
    },
    callback: (lastReason: any, attemptIndex: number) => Thenable<Return> | Return
): Promise<Return>;
```

- **options:** Retry options.
  + **limit:** Try limit times (defaults to 3).
  + **interval:** Interval between two tries (defaults to 0).
- **callback:** Retry callback.
- **return:** Created promise.

##### Promise.using()

Use a disposable resource and dispose it after been used.

```ts
static using<Resource, Return>(
    disposable: Thenable<Disposable<Resource>> | Disposable<Resource>,
    handler: (resource: Resource) => Return
): Promise<Return>;
```

- **disposable:** The disposable resource or a thenable of disposable resource.
- **handler:** Using handler.
- **return:** Created promise.

##### Promise.invoke()

Invoke a Node style asynchronous function that accepts the last argument as callback.

```ts
static invoke<Value>(fn: Function, ...args: any[]): Promise<Value>;
```

- **fn:** Node style asynchronous function.
- **args:** Arguments.
- **return:** Created promise.

#### Static properties

##### Promise.break

(fake statement) This getter will always throw a break signal that interrupts the promises chain.

```ts
static get break(): void;
```

##### Promise.breakSignal

(get) The break signal.

```ts
static get breakSignal(): any;
```

##### Promise.preBreakSignal

(get) The pre-break signal.

```ts
static get preBreakSignal(): any;
```

##### Promise.void

(get) A promise that has already been fulfilled with `undefined`.

```ts
static get void(): Promise<void>;
```

##### Promise.true

(get) A promise that has already been fulfilled with `true`.

```ts
static get true(): Promise<boolean>;
```

##### Promise.false

(get) A promise that has already been fulfilled with `false`.

```ts
static get false(): Promise<boolean>;
```

### PromiseLock

Promise lock is a useful helper that can act as a simple task queue.

#### Constructor

```ts
constructor();
```

#### Methods

##### PromiseLock#lock()

The lock will keep locked until the return value of previous lock handler gets fulfilled. And a handler will only be called once the lock is unlocked.

```ts
lock<Return>(handler: () => Thenable<Return> | Return): Promise<Return>;
```

- **handler:** Promise lock handler.
- **return:** Created promise, will be fulfilled once the return value of lock handler gets fulfilled.
