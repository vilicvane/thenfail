import { Resolvable, Promise } from '../promise';

export type LockHandler<TResult> = () => Resolvable<TResult>;

/**
 * `Lock` class is a useful helper that can act as a simple task queue.
 */
export class Lock {
    private _promise = Promise.void;

    /**
     * Handler will be called once the return value of previous queued handler
     * gets settled.
     * @param handler Queue handler.
     * @return Created promise, will be settled once the handler throws an
     *     error or the return value of the handler gets settled.
     */
    queue<TResult>(handler: LockHandler<TResult>): Promise<TResult> {
        let promise = this._promise.then(handler);
        this._promise = promise.void.fail(reason => undefined);
        return promise;
    }
    
    /**
     * Handler will be called if there's no queued ones.
     * @param handler Try handler.
     * @return Created promise, will be settled once the handler throws an
     *     error or the return value of the handler gets settled.
     */
    try<TResult>(handler: LockHandler<TResult>): Promise<TResult> {
        if (this._promise.pending) {
            return <Promise<any>>this._promise;
        } else {
            return this.queue(handler);
        }
    }
    
    /**
     * (get) A function that binds `queue` method with current instance.
     */
    get queuer(): <TResult>(handler: LockHandler<TResult>) => Promise<TResult> {
        return this.queue.bind(this);
    }
    
    /**
     * (get) A function that binds `try` method with current instance.
     */
    get trier(): <TResult>(handler: LockHandler<TResult>) => Promise<TResult> {
        return this.try.bind(this);
    }
}
