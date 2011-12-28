var debug = require('debug')('statestore'),
    events = require('events'),
    util = require('util'),
    _watchStores = [];

var CheckpointStore = exports.CheckpointStore = function(opts) {
    // ensure we have options
    opts = opts || {};
    this.writeDelay = typeof opts.writeDelay != 'undefined' ? opts.writeDelay : 1000;
    
    this.data = {};
    this.persistTimer = 0;
    this.ready = false;
};

util.inherits(CheckpointStore, events.EventEmitter);

/**
 * Used to retrieve the state for the current target from the state store
 */
CheckpointStore.prototype.retrieve = function(target, callback) {
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
CheckpointStore.prototype.update = function(target, newState) {
    // copy the state information
    var saveState = {},
        store = this;
        
    function persist() {
        // persist the store
        store.persist(function(err) {
            debug('persist finished', err);
            
            // reset the persist timer
            store.persistTimer = 0;

            // emit an error, otherwise emit done
            if (err) {
                debug('CAPTURED ERROR PERSISTING CHECKPOINT DATA', err);
                store.emit('error', err);
            }
            else {
                store.emit('done');
            }
        });
    }
    
    Object.keys(newState || {}).forEach(function(key) {
        saveState[key] = newState[key];
    });
    
    // update the target state in the data
    debug('received update for target "' + target + '", ', saveState);
    this.data[target] = saveState;
    
    // if we have not scheduled a persist, then do it now
    if (! this.persistTimer) {
        var watchIndex = _watchStores.indexOf(store);
        if (watchIndex >= 0) {
            _watchStores.splice(watchIndex, 1);
        }
        
        // persist on exit
        _watchStores.push(store);

        if (this.writeDelay) {
            debug('writing store in ' + this.writeDelay + 'ms');
            this.persistTimer = setTimeout(persist, this.writeDelay);
        }
        else {
            debug('writing store');
            persist();
        }
    }
};

/* on exit handler for syncing stores */

process.on('exit', function() {
    debug('captured process exit, attempting to persist ' + _watchStores.length + ' stores');
    
    _watchStores.forEach(function(store) {
        // if the store has a persist sync function, use that
        if (store.persistSync) {
            store.persistSync();
        }
        // otherwise, try with the default
        else {
            store.persist();
        }
    });
});