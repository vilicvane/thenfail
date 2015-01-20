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
var promise = new ThenFail<string>((resove, reject) => {
    resolve('test');

    // or reject
    // reject(new Error());
});

// or a promise with a value
var promise = ThenFail.resolved('test');
// or a promise already rejected with a reason
var promise = ThenFail.rejected(new Error());
```

Wrap other Promise implementation and `then`...

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

And you get an `all`.

```typescript
ThenFail
    .all([promiseA, promiseB])
    .then(args => {
        var resultA = args[0];
        var resultB = args[1];
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

Handy "consts": `true`, `false` and `void` and short cut for `return`.

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

function testC() {
    var value = 'test';

    return testB()
        .return(value);
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