[![NPM Package](https://badge.fury.io/js/thenfail.svg)](https://www.npmjs.com/package/thenfail)
[![Build Status](https://travis-ci.org/vilic/thenfail.svg)](https://travis-ci.org/vilic/thenfail)

<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" align="right" />
</a>

# ThenFail v0.4

Just another Promises/A+ implementation written in TypeScript that provides control flow tools like `Promise.break`, `Promise.goto` and disposable context.

## Documentation

https://vilic.github.io/thenfail/doc

## Install

```sh
npm install thenfail --save
```

## Usage

```ts
import Promise from 'thenfail';
```

### First call

ThenFail added a static `then` method for the first call, which is equivalent to `Promise.resolve().then`.
While method `Promise.resolve` can also handle both normal value and promise-like value,
using the static `then` method can make sure errors thrown are caught.

```ts
Promise
    .then(() => {
        if (foo) {
            return Promise.resolve('foo');
        } else if (bar) {
            return 'bar';
        } else {
            throw new Error();
        }
    })
    .then(value => {
        console.log(value);
    });
```

### Create promise for event emitters

It is common to pipe a stream to another, taking piping a read stream to a write stream for example:

```ts
import * as FS from 'fs';

function copy(src: string, dest: string): Promise<void> {
    let readStream = FS.createReadStream(src);
    let writeStream = FS.createWriteStream(dest);

    readStream.pipe(writeStream);

    // Listen to `close` event of `writeStream` for fulfillment,
    // And listen to `error` event of `writeStream` as well as `readStream` for rejection.
    return Promise.for(writeStream, 'close', [readStream]);
}
```

### Control flow features

#### Promise.break

Sometimes chaining promises could be annoying. For example:

```ts
Promise
    .then(() => {
        // step 1
    })
    .then(() => {
        // step 2
        if (noNeedToContinue) {
            // How to break here?
        }
    })
    .then(() => {
        // step 3.1
    }, reason => {
        // step 3.2
    })
    .then(() => {
        // step 4
    });
```

Now it's easy with ThenFail:

```ts
Promise
    .then(() => {
        // step 1
    })
    .then(() => {
        // step 2
        if (noNeedToContinue) {
            Promise.break;
        }
    })
    .then(() => {
        // step 3.1
    }, reason => {
        // step 3.2
    })
    .then(() => {
        // step 4
    })
    // enclose current context so it won't break too many.
    // it should be required if this could be directly chained somewhere else.
    // e.g. Returned as your method result.
    .enclose();
```

#### Promise.goto

```ts
Promise
    .then(() => {
        if (someCondition) {
            Promise.goto('label-a');
        } else {
            Promise.goto('label-b');
        }
    })
    .then(() => {
        // will not be called.
    })
    .label('label-a', () => {
        // step 3.1
    }, reason => {
        // step 3.2
    })
    .label('label-b', () => {
        // step 4
        // be aware that `goto` `"label-a"` won't prevent the execution of `"label-b"`.
    });
```

#### Promise context

There's situations we may want to cancel a promise chain, not only from inside (like using `Promise.break`), but also from outside:

```ts
page.on('load', () => {
    Promise
        .then(() => {
            // do some works...
        })
        .then(() => {
            // more works...
        })
        .then(() => {
            // ...
        });
});

page.on('unload', () => {
    // how can we cancel the promise chain?
});
```

With ThenFail, every promise has something called `context`. And if the context is disposed, the chain gets cancelled.

```ts
import { Context } from 'thenfail';

let context: Context;

page.on('load', () => {
    let promise = Promise
        .then(() => {
            // do some works...
        })
        .then(() => {
            // more works...
        })
        .then(() => {
            // ...
        });

    context = promise.context;
});

page.on('unload', () => {
    // dispose the context.
    if (context) {
        context.dispose();
        context = undefined;
    }
});
```

As what you might guess, The `enclose` method we mentioned before can mark current context as enclosed,
and no longer accept new promises being under the same context.
Which means a new context will be created when the `then` method is called.

## Notable basics

### States

Promises/A+ defines 3 states of a promise: _pending_, _fulfilled_ and _rejected_. And only the _pending_ state may transform to other states.

In the implementation of ThenFail, one more state _skipped_ is added to specify the state of promises skipped by (fake) `break`, `goto` or a disposed context (However, the promise of which `onfulfilled` or `onrejected` has been called will not be _skipped_).

### Resolve

_Resolve_ is a process that may change the state of promise from _pending_ to either _fulfilled_ or _rejected_ (not just the former state).

## Terms

### Promise

A _promise_ in the documentation means the implementation of Promises/A+ in ThenFail.

### Thenable/PromiseLike

A _thenable_ or _promise-like_ in the documentation means any other implementation that might act somewhat or exactly as we may expect a Promises/A or Promises/A+ implementation will.

### Resolvable

A _resolvable_ in the documentation means a _thenable_/_promise-like_ or a normal value.

## License

MIT License.
