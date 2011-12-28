var assert = require('assert'),
    cm = require('../'),
    debug = require('debug')('tests'),
    _machine;
    
describe('neuron job queues', function() {
    it('can create a machine without a target, for pure neuron job processing', function() {
        _machine = new cm.Machine();
        assert(_machine);
    });
    
    it('has a job queue associated', function() {
        assert(_machine.job);
    });
    
    it('processed items are removed from the job queue', function(done) {
        _machine.once('process', function(item) {
            assert.equal(Object.keys(_machine.job.running).length, 1, 'one item running');

            // fail the item
            item.done();
            
            assert.equal(Object.keys(_machine.job.running).length, 0, 'no items running');
            done();
        });
        
        (new cm.Item()).enter(_machine);
    });
    
    it('failed items leave when leaveOn.fail = true', function(done) {
        _machine.leaveOn.fail = true;
        _machine.once('process', function(item) {
            assert.equal(Object.keys(_machine.job.running).length, 1, 'one item running');

            // fail the item
            item.fail();
            
            assert.equal(Object.keys(_machine.job.running).length, 0, 'failed item removed from queue');
            done();
        });
        
        (new cm.Item()).enter(_machine);
    });

    it('failed items remain in the queue by default', function(done) {
        _machine.leaveOn.fail = false;
        _machine.once('process', function(item) {
            assert.equal(Object.keys(_machine.job.running).length, 1, 'one item running');

            // fail the item
            item.fail();
            
            assert.equal(Object.keys(_machine.job.running).length, 1, 'failed item remains in job queue');
            done();
        });
        
        (new cm.Item()).enter(_machine);
    });
});