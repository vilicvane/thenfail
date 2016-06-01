import Promise, { invoke, NodeStyleCallback } from '../index';

let testValue = {
    value: 'test value'
};

describe('Feature: invoke', () => {
    context('Successful invocation', () => {
        it('Invoke successfully asynchronously', () => {
            return invoke((a: number, b: string, callback: NodeStyleCallback<typeof testValue>) => {
                    a.should.equal(123);
                    b.should.equal('abc');

                    setTimeout(() => {
                        callback(undefined, testValue);
                    }, 10);
                }, 123, 'abc')
                .should.eventually.equal(testValue);
        });

        it('Invoke successfully synchronously', () => {
            return invoke((a: number, b: string, callback: NodeStyleCallback<typeof testValue>) => {
                    a.should.equal(123);
                    b.should.equal('abc');

                    callback(undefined, testValue);
                }, 123, 'abc')
                .should.eventually.equal(testValue);
        });
    });

    context('Failed invocation', () => {
        it('Invoke failed asynchronously', () => {
            return invoke((a: number, b: string, callback: NodeStyleCallback<typeof testValue>) => {
                    a.should.equal(123);
                    b.should.equal('abc');

                    setTimeout(() => {
                        callback(new Error('invoke-failure'));
                    }, 10);
                }, 123, 'abc')
                .should.be.rejectedWith(Error, 'invoke-failure');
        });

        it('Invoke successfully synchronously', () => {
            return invoke((a: number, b: string, callback: NodeStyleCallback<typeof testValue>) => {
                    a.should.equal(123);
                    b.should.equal('abc');

                    callback(new Error('invoke-failure'));
                }, 123, 'abc')
                .should.be.rejectedWith(Error, 'invoke-failure');
        });
    });
});
