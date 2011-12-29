var assert = require('assert'),
    cm = require('../'),
    _machine = new cm.Machine();
    
describe('machine produces fail events', function() {
    it('machine initialized ok', function() {
        assert(_machine);
    });
    
    it('machine captures a fail event on item.fail()', function(done) {
        var testItem = new cm.Item();
        
        _machine.on('fail', function(item, err) {
            assert.strictEqual(item, testItem, 'failed item passed to fail event');
            assert(err instanceof Error, 'error passed to fail event');
            assert.equal(err.message, 'Item busted', 'Error message matches');
            done();
        });
        
        _machine.once('process', function(item) {
            item.fail({ error: new Error('Item busted') });
        });
        
        testItem.enter(_machine);
    });
});