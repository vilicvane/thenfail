import Promise from '../../index';

export type TestDoneHandler = (error?: string) => void;
export type Test<T> = (promise: Promise<T>, done: TestDoneHandler) => void;

export function testFulfilled<T>(value: T, test: Test<T>): void {
    it('already-fulfilled', done => {
        test(Promise.resolve(value), done);
    });

    it('immediately-fulfilled', done => {
        var promise = new Promise<T>();
        test(promise, done);
        promise.resolve(value);
    });

    it('eventually-fulfilled', done => {
        var promise = new Promise<T>();
        test(promise, done);
        setTimeout(() => {
            promise.resolve(value);
        }, 10);
    });
}

export function testRejected<T>(reason: any, test: Test<T>): void {
    it('already-rejected', done => {
        test(Promise.reject<T>(reason), done);
    });

    it('immediately-rejected', done => {
        var promise = new Promise<T>();
        test(promise, done);
        promise.reject(reason);
    });

    it('eventually-rejected', done => {
        var promise = new Promise<T>();
        test(promise, done);
        setTimeout(() => {
            promise.reject(reason);
        }, 10);
    });
};
