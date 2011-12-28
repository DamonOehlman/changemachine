var assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    cm = require('../'),
    debug = require('debug')('tests'),
    _machine;
    
function _on(status, opts, outStatus, callback) {
    var testItem;
    
    _machine.once(outStatus, function(item) {
        assert.strictEqual(item, testItem);
        callback();
    });
    
    _machine.once('process', function(item) {
        testItem = item;
        item[status].call(item, opts);
    });
} // _on

describe('machine raised appropriate events', function() {
    it('can create a machine to handle couch updates', function() {
        _machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');
        
        assert(_machine);
    });
    
    it('captures a done event on done', function(callback) {
        _on('done', {}, 'done', callback);
    });

    it('captures a fail event on fail', function(callback) {
        _on('fail', {}, 'fail', callback);
    });
    
    it('captures a skip event on skip', function(callback) {
        _on('done', {}, 'done', callback);
    });
    
    it('captures a fail event on done with error', function(callback) {
        _on('done', { error: 'I failed :(' }, 'fail', callback);
    });
});