import { expect } from 'chai';

const ThenFail = require('../index');
const Promise = ThenFail.Promise;

describe('Module: exports', () => {
    it('should export Promise and default', () => {
        expect(typeof Promise).to.equal('function');
        expect(Promise).to.equal(ThenFail.default);
    });

    it('should export Promise.using and Promise.invoke', () => {
        expect(typeof ThenFail.using).to.equal('function');
        expect(ThenFail.using).to.equal(Promise.using);

        expect(typeof ThenFail.invoke).to.equal('function');
        expect(ThenFail.invoke).to.equal(Promise.invoke);
    });

    it('should set __esModule flag', () => {
        expect(ThenFail.__esModule).to.be.true;
    });
});
