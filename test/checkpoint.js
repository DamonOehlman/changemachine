var assert = require('assert'),
    path = require('path'),
    cm = require('../'),
    debug = require('debug')('tests'),
    _lastSeq,
    _machine,
    _processedCount = 0,
    _store;
    
describe('check json checkpoint storage works', function() {
    it('can create a store', function() {
        _store = new cm.JsonStore({ filename: path.resolve(__dirname, 'checkpoint.json') });
        assert(_store);
    });
    
    it('can create a machine to handle couch updates', function() {
        _machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
            storage: _store
        });
        
        assert(_machine);
        assert.strictEqual(_machine.storage, _store, 'machine has been created with the correct store');
    });
    
    it('can capture process events', function(done) {
        _machine.on('process', function(item) {
            // save the last sequence as that will be persisted as the since value
            _lastSeq = item.seq;
            _processedCount++;
            item.done();
        });
        
        _machine.once('process', done);
    });
    
    it('can process updates for the machine', function(done) {
        setTimeout(done, 1500);
    });
});