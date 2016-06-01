import { EventEmitter } from 'events';

import Promise from '../index';

let testError = new Error();

let testValue = {
    value: 'test value'
};

describe('Feature: for', () => {
    context('For EventEmitter', () => {
        it('Should fulfill on single event type to listen', () => {
            let emitter = new EventEmitter();
            let promise = Promise.for(emitter, 'close');

            setImmediate(() => emitter.emit('close'));

            return promise.should.eventually.be.undefined;
        });

        it('Should fulfill on single event type to listen with value', () => {
            let emitter = new EventEmitter();
            let promise = Promise.for(emitter, 'close');

            setImmediate(() => emitter.emit('close', testValue));

            return promise.should.eventually.equal(testValue);
        });

        it('Should fulfill on multiple event types to listen', () => {
            let emitter = new EventEmitter();
            let promise = Promise.for(emitter, ['end', 'finish']);

            setImmediate(() => emitter.emit('finish'));

            return promise.should.eventually.be.undefined;
        });

        it('Should reject on error event', () => {
            let emitter = new EventEmitter();
            let promise = Promise.for(emitter, 'close');

            setImmediate(() => emitter.emit('error', testError));

            return promise.should.be.rejectedWith(testError);
        });

        it('Should reject on error event emitted by error emitters', () => {
            let emitter = new EventEmitter();
            let errorEmitter = new EventEmitter();

            let promise = Promise.for(emitter, 'close', [errorEmitter]);

            setImmediate(() => errorEmitter.emit('error', testError));

            return promise.should.be.rejectedWith(testError);
        });

        it('Should not fulfill on event emitted by error emitters', () => {
            let emitter = new EventEmitter();
            let errorEmitter = new EventEmitter();

            let promise = Promise.for(emitter, 'close', [errorEmitter]);

            setImmediate(() => errorEmitter.emit('close'));

            return Promise
                .delay(10)
                .then(() => {
                    promise.pending.should.be.true;
                });
        });
    });
});
