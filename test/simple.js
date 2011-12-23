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
            done();
        });
        
        newItem.enter(_machine);
    });
});