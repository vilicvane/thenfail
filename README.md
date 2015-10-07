<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" align="right" />
</a>

# ThenFail v0.3 [![Build Status](https://travis-ci.org/vilic/thenfail.svg)](https://travis-ci.org/vilic/thenfail)

Just another Promises/A+ implementation written in TypeScript.

Core features and changes in v0.3:

+ Optimized for better performance.
+ Control flow tools like context and `Promise.break`.

## API references

[ThenFail v0.3 API references](./docs/api-references.md)

## What is promise

Promise is a pattern for handling asynchronous operations.

The most obvious benifit you may get from promise itself IMO is on error handling,
and maybe the ability to `await` an `async` operation in the future (ES7 and TypeScript 1.6/2.0).

## Install ThenFail

```sh
npm install thenfail --save
```

If you are using TypeScript, ThenFail requires version 1.6 to compile correctly.

## Create a promise from the scratch

My personal promise experience began with [Q](https://github.com/kriskowal/q/) (a popular Promises/A+ implementation).
But believe it or not, I spent a lot of time just for fully understanding how to actually create a promise.

So let's put the beginning at the beginning (unlike where Q put it), how to create the very first promise with ThenFail?

Firstly, let's import ThenFail:

```ts
import Promise from 'thenfail';
```

Then let's follow the ES6 standard:

```ts
let firstPromise = new Promise((resolve, reject) => {
    setTimeout(() => resolve('biu'), 100);
});
```

And now we've created a promise that will be *fulfilled* with string `"biu"` after 100 ms.

Which means if we add the `then` method (which you see everywhere) with `console.log`, you will be able to see the output after 100 ms:

```ts
// Logs "biu" in 100 ms.
let secondPromise = firstPromise.then(result => console.log(result));
```

And... Wait, we get the `secondPromise`? Yes, every time we call `then` with handler(s), it creates another promise.
The newly created promise will be *fulfilled* after the task in the handler gets done.

But how does it determine whether the task is done?

The method `then` generally accepts two parameters, an `onfulfilled` handler and an `onrejected` handler.
Only one of the two handlers would ever be called (if both of them exist) depending on the state of the previous promise.
And when been called, it returns a normal value or a promise, or otherwise, throws an error.

If the handler does not return a promise, like in the previous example (which returns `undefined`),
the created promise (as `then` method will create a promise any way) will be switched to state *fulfilled* (or *rejected* if the handler throws an error).

Otherwise, the state of the created promise will be determined by the promise returned in the handler (which might take some time to be settled, asynchronously).
And if there's a following `then`, the handlers in it will be triggered later depending on the returned promise.

## Create a ThenFail promise chain

We've learned how to use the constructor to create a promise, but usually we only use that way to bridge other style of asynchronous code.
When we are writting our own promised API based on other promised API, we can make it simpler:

```ts
function getResource(url: string): Promise<Resource> {
    if (url) {
        return Promise
            .then(() => {
                if (url in cache) {
                    return cache[url];
                } else {
                    return fetchRemoteRawResource(url);
                }
                
                // And you can certainly throw an error here.
                // It will be caught by the promise chain and trigger the closest `onrejected` handler.
            })
            .then(rawResource => processResource(rawResource));
    } else {
        // Never return `undefined` directly in an API that's meant to return a promise.
        // In ThenFail, you may use something like this.
        return Promise.void;
    }
}

getResource('the-resouce-url').then(resource => {
    if (resource) {
        // ...
    }
});
```

Promise works great with other promises. There are two points in this sentense:

1. Promise works great in a promise-based architecture.
2. A promise implementation usually plays well with other promise implementations. (Or it will most likely fail the Promises/A+ test suite.)

But there's a simple issue.
Different implementations of promise have different APIs, some libraries you need may use Q, and some others might use [Bluebird](https://github.com/petkaantonov/bluebird).
Even the versions could vary. So when writing your own modules, you may want to unify the promises.

Assuming you are getting a promise (or a normal value if it might be), you may use the standard `resolve` method:

```ts
// A thenable is a promise like object (or a promise by another implementation).
function foo(bar: Thenable<string>|string): Promise<number> {
    return Promise
        .resolve(bar)
        .then(str => str.length);
}
```

After `resolve`, the promise or value will be converted to a ThenFail promise (if it's not).
This will help preventing some undesired behaviors or errors from happening.

## Control flow with ThenFail

### Promise.break

Sometimes chaining promises could be annoying. For example:

```ts
Promise
    .then(() => {
        // Step 1
    })
    .then(() => {
        // Step 2
        if (noNeedToContinue) {
            // How to break here?
        }
    })
    .then(() => {
        // Step 3.1
    }, reason => {
        // Step 3.2
    })
    .then(() => {
        // Step 4
    });
```

Now it's easy with ThenFail:

```ts
Promise
    .then(() => {
        // Step 1
    })
    .then(() => {
        // Step 2
        if (noNeedToContinue) {
            Promise.break;
        }
    })
    .then(() => {
        // Step 3.1
    }, reason => {
        // Step 3.2
    })
    .then(() => {
        // Step 4
    })
    // Enclose current context so it won't break too many.
    // It should be required if this could be directly chained somewhere else.
    // E.g. Returned as your method result.
    .enclose();
```

### Promise context

There's situations we may want to cancel a promise chain, not only from inside (like using `Promise.break`), but also from outside:

```ts
page.on('load', () => {
    Promise
        .then(() => {
            // Do some works...
        })
        .then(() => {
            // More works...
        })
        .then(() => {
            // ...
        });
});

page.on('unload', () => {
    // How can we cancel the promise chain?
});
```

With ThenFail, every promise has something called `context`. And if the context is disposed, the chain gets cancelled.

```ts
import { Context } from 'thenfail';

let context: Context;

page.on('load', () => {
    let promise = Promise
        .then(() => {
            // Do some works...
        })
        .then(() => {
            // More works...
        })
        .then(() => {
            // ...
        });
    
    context = promise.context;
});

page.on('unload', () => {
    // Dispose the context.
    if (context) {
        context.dispose();
        context = undefined;
    }
});
```

As what you might guess, The `enclose` method we mentioned before can mark current context as enclosed,
and no longer accept new promises being under the same context.
Which means a new context will be created when the `then` method is called.

## License

MIT License.
