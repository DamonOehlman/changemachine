var fs = require('fs'),
    path = require('path'),
    util = require('util'),
    StateStore = require('./base').StateStore;

var JsonStore = exports.JsonStore = function(opts) {
    var store = this;
    
    // initialise the target file
    this.filename = opts.filename || path.resolve('changemachine.json');
    
    // call the inherited constructor
    StateStore.call(this);
    
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

util.inherits(JsonStore, StateStore);

JsonStore.prototype.persist = function(callback) {
    // save the data to the file
    fs.writeFile(this.filename, JSON.stringify(this.data), 'utf8', callback);
};

JsonStore.prototype.persistSync = function() {
    // save the data to the file
    return fs.writeFileSync(this.filename, JSON.stringify(this.data), 'utf8');
};