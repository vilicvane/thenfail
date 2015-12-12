import { Resolvable, Promise } from '../promise';

export type PromiseLockHandler<TResult> = () => Resolvable<TResult>;

/** @deprecated */
export class PromiseLock {
    private _promise = Promise.void;

    lock<TResult>(handler: PromiseLockHandler<TResult>): Promise<TResult> {
        let promise = this._promise.then(handler);
        this._promise = promise.void.fail(reason => undefined);
        return promise;
    }
    
    get locker(): <TResult>(handler: PromiseLockHandler<TResult>) => Promise<TResult> {
        return this.lock.bind(this);
    }
}
