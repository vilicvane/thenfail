import Promise from '../index';
import { expect } from 'chai';

describe('Feature: constants', () => {
    let map: HashTable<any> = {
        true: true,
        false: false,
        void: undefined as void
    };

    context('Static constants', () => {
        Object
            .keys(map)
            .forEach(key => {
                let expectedValue = map[key];

                it('Promise.' + key + ' should eventually equal `' + expectedValue + '`', () => {
                    return (<any>Promise as HashTable<Promise<any>>)[key].then(value => {
                        expect(value).to.equal(expectedValue);
                    });
                });
            });
    });

    context('Property constants', () => {
        let promise = Promise.when(0);

        Object
            .keys(map)
            .forEach(key => {
                let expectedValue = map[key];

                it('promise.' + key + ' should eventually equal `' + expectedValue + '`', () => {
                    return (<any>promise as HashTable<Promise<any>>)[key].then(value => {
                        expect(value).to.equal(expectedValue);
                    });
                });
            });
    });
});
