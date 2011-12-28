var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    cm = require('../'),
    debug = require('debug')('tests'),
    target = '<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood',
    storeFile = path.resolve(__dirname, 'checkpoint.json'),
    _readTimer = 0,
    _lastSeq,
    _machine,
    _processedCount = 0,
    _store = new cm.JsonStore({ filename: storeFile, writeDelay: 0 });
    
function _captureUpdate(status, opts, callback) {
    return function(item) {
        // save the last sequence as that will be persisted as the since value
        _lastSeq = item.seq;
        _processedCount++;
        
        // trigger the callback
        callback();

        // call the status method
        item[status].call(item, opts);
    };
} // _captureUpdate

function _readLastSeq(callback) {
    
    function readSeq() {
        clearTimeout(_readTimer);
        
        fs.readFile(storeFile, 'utf8', function(err, data) {
            if (! err) {
                data = JSON.parse(data);
                callback(data[target].since);
            }
            else {
                callback();
            }
        });
    }
    
    _machine.storage.removeAllListeners('done');
    _machine.storage.on('done', readSeq);

    clearTimeout(_readTimer);
    _readTimer = setTimeout(readSeq, 500);
} // readLastSeq
    
describe('check json checkpoint storage works', function() {
    beforeEach(function() {
        _machine = new cm.Machine(target, {
            storage: _store
        });

        assert(_machine);
        assert.strictEqual(_machine.storage, _store, 'machine has been created with the correct store');
    });
    
    afterEach(function() {
        _machine.close();
    });
    
    it('storage not updated on fail', function(done) {
        _machine.once('process', _captureUpdate('fail', {}, function() {
            _machine.once('fail', function(item) {
                _readLastSeq(function(readSeq) {
                    assert.notEqual(readSeq, _lastSeq);
                    done();
                });
            });
        }));
    });
    
    it('storage updated on done', function(done) {
        _machine.once('process', _captureUpdate('done', {}, function() {
            _machine.once('done', function(item) {
                _readLastSeq(function(readSeq) {
                    assert.equal(readSeq, _lastSeq);
                    done();
                });
            });
        }));
    });
    
    it('storage updated on fail requesting a checkpoint update', function(done) {
        _machine.once('process', _captureUpdate('fail', { checkpoint: true }, function() {
            _machine.once('fail', function(item) {
                _readLastSeq(function(readSeq) {
                    assert.equal(readSeq, _lastSeq);
                    done();
                });
            });
        }));
    });

    it('storage updated on fail, when machine checkpointOn.fail = true', function(done) {
        _machine.checkpointOn.fail = true;
        _machine.once('process', _captureUpdate('fail', {}, function() {
            _machine.once('fail', function(item) {
                _readLastSeq(function(readSeq) {
                    assert.equal(readSeq, _lastSeq);
                    done();
                });
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
    
    
    it('storage updated on skip', function(done) {
        _machine.once('process', _captureUpdate('skip', {}, function() {
            _readLastSeq(function(readSeq) {
                assert.equal(readSeq, _lastSeq);
                done();
            });
        }));
    });
    
    it('storage not updated on done, when error supplied', function(done) {
        _machine.checkpointOn.fail = false;
        _machine.once('process', _captureUpdate('done', { error: 'This has failed' }, function() {
            _readLastSeq(function(readSeq) {
                assert.notEqual(readSeq, _lastSeq);
                done();
            });
        }));
    });
});