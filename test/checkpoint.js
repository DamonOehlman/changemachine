var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    cm = require('../'),
    debug = require('debug')('tests'),
    target = '<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood',
    storeFile = path.resolve(__dirname, 'checkpoint.json'),
    _lastSeq,
    _machine,
    _processedCount = 0,
    _store;
    
function _captureUpdate(status, opts, callback) {
    return function(item) {
        // save the last sequence as that will be persisted as the since value
        _lastSeq = item.seq;
        _processedCount++;
        
        // call the status method
        item[status].call(item, opts);
        
        // trigger the callback
        process.nextTick(callback);
    };
} // _captureUpdate

function _readLastSeq(callback) {
    fs.readFile(storeFile, 'utf8', function(err, data) {
        data = JSON.parse(data);
        callback(data[target].since);
    });
} // readLastSeq
    
describe('check json checkpoint storage works', function() {
    it('can create a store', function() {
        _store = new cm.JsonStore({ filename: storeFile, writeDelay: 0 });
        assert(_store);
    });
    
    it('can create a machine to handle couch updates', function() {
        _machine = new cm.Machine(target, {
            storage: _store
        });
        
        assert(_machine);
        assert.strictEqual(_machine.storage, _store, 'machine has been created with the correct store');
    });
    
    it('storage not updated on fail', function(done) {
        _machine.once('process', _captureUpdate('fail', {}, function() {
            _readLastSeq(function(readSeq) {
                assert.notEqual(readSeq, _lastSeq);
                done();
            });
        }));
    });
    
    it('storage updated on done', function(done) {
        _machine.once('process', _captureUpdate('done', {}, function() {
            _readLastSeq(function(readSeq) {
                assert.equal(readSeq, _lastSeq);
                done();
            });
        }));
    });
    
    it('storage updated on fail requesting a checkpoint update', function(done) {
        _machine.once('process', _captureUpdate('fail', { checkpoint: true }, function() {
            _readLastSeq(function(readSeq) {
                assert.equal(readSeq, _lastSeq);
                done();
            });
        }));
    });

    it('storage updated on fail, when machine checkpointOn.fail = true', function(done) {
        _machine.checkpointOn.fail = true;
        _machine.once('process', _captureUpdate('fail', {}, function() {
            _readLastSeq(function(readSeq) {
                assert.equal(readSeq, _lastSeq);
                done();
            });
        }));
    });
    
    it('storage not updated on done, when machine checkpointOn.done = false', function(done) {
        _machine.checkpointOn.done = false;
        _machine.once('process', _captureUpdate('done', {}, function() {
            _readLastSeq(function(readSeq) {
                assert.notEqual(readSeq, _lastSeq);
                done();
            });
        }));
    });
    
});