var assert = require('assert'),
    cm = require('../'),
    debug = require('debug')('tests'),
    _machine;
    
describe('changemachine neuron mapping', function() {
    it('can create a machine without a target, for pure neuron job processing', function() {
        _machine = new cm.Machine();
        assert(_machine);
    });
    
    it('can add items to the machine', function() {
        new cm.Item({ id: 'test' }).enter(_machine);
    });
});