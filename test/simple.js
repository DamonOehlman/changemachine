var assert = require('assert'),
    cm = require('../'),
    debug = require('debug')('tests'),
    _machine;
    
describe('changemachine neuron mapping', function() {
    it('can create a machine without a target, for pure neuron job processing', function() {
        _machine = new cm.Machine();
        assert(_machine);
    });
    
    it('can add items to the machine', function(done) {
        var newItem = new cm.Item();
        
        _machine.once('enter', function(item) {
            assert.strictEqual(newItem, item);
            
            // check that the item status is flagged as entered
            assert.equal(_machine.stats().entered, 1, 'item in "entered" queue');
            
            // check on the next tick the status has changed to ready
            process.nextTick(function() {
                assert.equal(_machine.stats().ready, 1, 'item in "ready" queue');
                assert.equal(_machine.stats().entered, 0, 'item removed from "entered" queue');
                done();
            });
        });
        
        newItem.enter(_machine);
    });
});