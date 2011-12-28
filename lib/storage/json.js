var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    debug = require('debug')('statestore'),
    CheckpointStore = require('./base').CheckpointStore;

var JsonStore = exports.JsonStore = function(opts) {
    var store = this;
    
    // initialise the target file
    this.filename = opts.filename || path.resolve('changemachine.json');
    
    // call the inherited constructor
    CheckpointStore.call(this, opts);
    
    // load the file
    fs.readFile(this.filename, 'utf8', function(err, data) {
        if (! err) {
            try {
                // update the data
                store.data = JSON.parse(data);
            }
            catch(e) {
                // invalid data, trigger an error message
                store.emit('error', e);
            }
        }
        
        store.emit('ready');
        store.ready = true;
    });
};

util.inherits(JsonStore, CheckpointStore);

JsonStore.prototype.persist = function(callback) {
    // save the data to the file
    debug('writing checkpoint data to ' + this.filename);
    
    // changed for 0.1.6
    // TODO: investigate why writeFile wasn't firing callback
    fs.writeFileSync(this.filename, JSON.stringify(this.data), 'utf8');
    
    // fire the callback
    process.nextTick(callback);
};

JsonStore.prototype.persistSync = function() {
    // save the data to the file
    return fs.writeFileSync(this.filename, JSON.stringify(this.data), 'utf8');
};