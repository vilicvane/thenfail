import Promise from '../index';

import { testFulfilled, testRejected } from './helpers/three-cases';

describe('Feature: interruption', () => {
    it('Should not invoke context disposed handler if interrupted by break', done => {
        let str = '';
        
        Promise
            .void
            .break
            .interruption(() => {
                str += 'a';
            });
        
        setTimeout(() => {
            str.should.equal('');
            done();
        }, 10);
    });
    
    it('Should invoke context disposed handler if interrupted by context disposal', done => {
        let promise = Promise.then(() => {
            return Promise
                .then(() => {
                    return Promise.delay(20);
                })
                .interruption(() => {
                    done();
                });
        });
        
        setTimeout(() => promise.context.dispose(), 10);
    });
});
