var debug = require('debug')('statestore'),
    events = require('events'),
    util = require('util');

var StateStore = exports.StateStore = function(opts) {
    // ensure we have options
    opts = opts || {};
    this.writeDelay = opts.writeDelay || 1000;
    
    this.data = {};
    this.persistTimer = 0;
    this.ready = false;
};

util.inherits(StateStore, events.EventEmitter);

/**
 * Used to retrieve the state for the current target from the state store
 */
StateStore.prototype.retrieve = function(target, callback) {
    var store = this;
    
    // if the store is ready, then return the data
    if (this.ready) {
        debug('retrieving state for target "' + target + '"');
        callback(this.data[target]);
    }
    // otherwise, wait until we are ready
    else {
        debug('state requested for target "' + target + '", not ready. waiting for ready event.');
        this.once('ready', function() {
            debug('ready. returning state for target: ' + target);
            callback(store.data[target]);
        });
    }
};

/** 
 * Update the state store with the updated state for the target
 */
StateStore.prototype.update = function(target, newState) {
    // copy the state information
    var saveState = {},
        store = this;
        
    function persist() {
        // persist the store
        store.persist(function(err) {
            // emit an error
            if (err) {
                store.emit('error', err);
            }
            
            // clear the timer
            store.persistTimer = 0;
        });
    }
    
    function persistSync() {
        // if the store has a persist sync function, use that
        if (store.persistSync) {
            store.persistSync();
        }
        // otherwise, try with the default
        else {
            store.persist();
        }
    }
        
    Object.keys(newState || {}).forEach(function(key) {
        saveState[key] = newState[key];
    });
    
    // update the target state in the data
    debug('received update for target "' + target + '", ', saveState);
    this.data[target] = saveState;
    
    // if we have not scheduled a persist, then do it now
    if (! this.persistTimer) {
        // persist on exit
        process.removeListener('exit', persistSync);
        process.on('exit', persistSync);
        
        this.persistTimer = setTimeout(persist, this.writeDelay);
    }
};