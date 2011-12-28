var assert = require('assert'),
    cm = require('../'),
    _machine;
    
describe('neuron job queues', function() {
    it('can create a machine with a specified id', function() {
        _machine = new cm.Machine('', { id: 'test' });
        assert(_machine);
    });
    
    it('only allows one machine to be active with a specified id at a time', function() {
        assert['throws'](function() {
            var machine = new cm.Machine('', { id: 'test' });
        }, Error);
    });
    
    it('can close the first machine', function(done) {
        _machine.once('close', done);
        _machine.close();
    });
    
    it('can now create the second machine with the same id', function() {
        var machine = new cm.Machine('', { id: 'test' });
        assert(machine);
    });
});