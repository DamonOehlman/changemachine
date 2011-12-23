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
            
            // check that the item status is flagged as waiting
            assert.equal(_machine.stats().waiting, 1, 'item in "waiting" queue');
            
            // check on the next tick the status has changed to ready
            process.nextTick(function() {
                assert.equal(_machine.stats().ready, 1, 'item in "ready" queue');
                assert.equal(_machine.stats().waiting, 0, 'item removed from "waiting" queue');
                assert.equal(_machine.stats().processing, undefined, 'machine does not yet have a processing queue');
                done();
            });
        });
        
        newItem.enter(_machine);
    });
    
    it('will start processing items once the machine has a process handler', function(done) {
        assert.equal(_machine.stats().ready, 1, 'item still in "ready" queue');
        
        _machine.on('process', function(item) {
            assert.equal(_machine.stats().processing, 1, 'item now in "processing" queue');
            assert.equal(_machine.stats().ready, 0, 'item no longer in "ready" queue');
            
            // mark the item as complete
            item.done();
            
            assert.equal(_machine.stats().processing, 0, 'item removed from "processing" queue');
            done();
        });
    });
});