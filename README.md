<a href="http://promises-aplus.github.com/promises-spec">
    <img src="http://promises-aplus.github.com/promises-spec/assets/logo-small.png" alt="Promises/A+ logo" align="right" />
</a>

# ThenFail [![Build Status](https://travis-ci.org/vilic/thenfail.svg)](https://travis-ci.org/vilic/thenfail)

Just another Promises/A+ implementation written in TypeScript.

## Usage

Create a promise from scratch.

```typescript
var promise = new ThenFail<string>();

promise
    .then(str => {
        console.log(str);
    });

promise.resolve('test');

// or reject
// promise.reject(new Error());

// another style
var promise = new ThenFail<string>((resolve, reject) => {
    resolve('test');

    // or reject
    // reject(new Error());
});

// or a promise with a value
var promise = ThenFail.resolved('test');
// or a promise already rejected with a reason
var promise = ThenFail.rejected(new Error());
```

Wrap other promise implementation and `then`...

```typescript
ThenFail
    .then(() => returnMightBePromiseValue())
    .then(() => console.log('ta-da'));
```

As the library name suggests you get a `fail(onrejected)` shortcut for `then(null, onrejected)`.

```typescript
ThenFail
    .then(() => throw new Error())
    .fail(reason => console.log(reason));
```

Want to log something following a promise?

```typescript
// log some preset text
ThenFail
    .delay(5000)
    .log('tick tick tick');

// or value/rejection
ThenFail
    .then(() => {
        if (Math.random() > 0.5) {
            throw new Error();
        } else {
            return 'success'
        }
    })
    .log();

// you may change ThenFail.Options.Log.valueLogger(...values: any[])
// or/and ThenFail.Options.Log.errorLogger(...reasons: any[])
// to your with your own logic, e.g., upload to a log server.

// by default, ThenFail will log rejections not been relayed,
// set ThenFail.logRejectionsNotRelayed to false if you want to disable that.
```

And you get `all` and `spread`.

```typescript
ThenFail
    .all([promiseA, promiseB])
    .spread((valueA: any, valueB: any) => {
        // do something...
    });
```

And `retry`, `delay` (also available on ThenFail instance).

```typescript
ThenFail
    .retry(() => {
        return ThenFail
            .delay(1000)
            .then(() => {
                if (Math.random() > 0.5) {
                    throw new Error();
                }
            });
    })
    .then(() => console.log('yo'))
    .fail(reason => console.log('oops'));
```

Also `each`, `map` and shortcut `return`.

```typescript
var arr = [1, 2, 3];

ThenFail
    .each(arr, n => ThenFail.delay(1000).log(n));

ThenFail
    .map(arr, n => ThenFail.delay(1000).return(n + 1))
    .then(arr => console.log(arr));

// .return(value) is the shortcut for .then(() => value)
```

Handy "consts": `true`, `false` and `void`.

```typescript
function testA(): ThenFail<boolean> {
    if (Math.random() > 0.5) {
        return ThenFail.true;
    } else {
        return ThenFail
            .delay(100)
            .false;
    }
}

function testB(): ThenFail<void> {
    return testA().void;
}
```

`PromiseLock` for the win!

```typescript
class Dialog extends ThenFail.PromiseLock {
    show() {
        this.lock(() => {
            console.log('biu');
            return ThenFail.delay(10000);
        });
    }
}

var dialog = new Dialog();

dialog.show();
dialog.show();
```

You may try to find out more usage from IDE intellisense information or by viewing source code.
API References will be there some day in the future, I think.

## License

MIT License.