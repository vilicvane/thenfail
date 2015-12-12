import { Resolvable, Promise } from '../promise';

export type PromiseLockHandler<TResult> = () => Resolvable<TResult>;

/**
 * Promise lock is a useful helper that can act as a simple task queue.
 * @deprecated
 */
export class PromiseLock {
    private _promise = Promise.void;

    /**
     * Handler will be called once this promise lock is unlocked, and it
     * will be locked again until the value returned by handler is
     * fulfilled.
     * @param handler Promise lock handler.
     * @returns Created promise, will be fulfilled once the return value of
     *     lock handler gets fulfilled.
     */
    lock<TResult>(handler: PromiseLockHandler<TResult>): Promise<TResult> {
        let promise = this._promise.then(handler);
        this._promise = promise
            .fail(reason => undefined)
            .void;
        return promise;
    }
    
    /**
     * (get) A function that binds `lock` method with current instance.
     */
    get locker(): <TResult>(handler: PromiseLockHandler<TResult>) => Promise<TResult> {
        return this.lock.bind(this);
    }
}
