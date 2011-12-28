var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    _exitCodes = {
        done: {
            autoCheckpoint: true
        },
        
        fail: {
            autoCheckpoint: false
        }
    },
    _itemCounter = 0,
    _waiters = {};
    
/* private functions */

function _leaveMachine(item, status, opts) {
    var currentMachine = item.machine,
        nextMachine,
        exitOpts = _exitCodes[status];
        
    // ensure we have options
    opts = opts || {};
    
    // flag whether the item should be checkpointed or not
    // if not specified, look at the autoCheckpoint value, otherwise use the value specified
    opts.checkpoint = typeof opts.checkpoint == 'undefined' ? exitOpts.autoCheckpoint : opts.checkpoint;
    
    // if the item does not have a current machine, then throw an exception
    if (! currentMachine) {
        throw new Error('Item "' + item.id + '" is attempting to leave a machine, but has not entered one');
    }
    
    // set the default status to done
    status = status || 'done';
    debug('item "' + item.id + '" is leaving machine "' + currentMachine.id + '" with status: ' + status);
    
    // if the item has a machine, then trigger the event on the machine
    if (currentMachine) {
        // checkpoint the item if we have the checkpoint info and we should
        if (item.checkpoint && opts.checkpoint) {
            currentMachine.saveCheckpoint(item.checkpoint);
        } 
        
        // emit the status event for the machine
        currentMachine.emit(status, item);
        
        // if the machine has a default target machine for the status, then
        // fall back to that for the next machine
        nextMachine = opts.next || currentMachine.defaultTargets[status];
    }
    
    // trigger the status event on the item
    item.emit.apply(item, [status].concat(Array.prototype.slice.call(arguments, 3)));
    
    // also trigger the more generic leave machine
    item.emit('leave', status, currentMachine);
    
    // update the item status, and flag this as a removal status
    item.machine.changeItemStatus(item, status, true);
    
    // if we have a next machine, then enter that machine
    if (nextMachine) {
        item.enter(nextMachine, currentMachine);
    }
    // otherwise, clear the item machine reference
    else {
        item.machine = null;
    }
} // _leaveMachine

function _processItem(item) {
    debug('processing item "' + item.id + '"');
    
    // emit the process event on the machine
    item.machine.changeItemStatus(item, 'processing');
    item.machine.emit('process', item);
} // _processItem

function _createWaiter(machine) {
    var items = [];
    
    function waitForProcessor(eventName) {
        if (eventName === 'process') {
            // remove the listener
            machine.removeListener('newListener', waitForProcessor);
            
            items.forEach(function(item) {
                // process the item (if the machine still matches)
                if (item.machine === machine) {
                    debug('captured process event being added to the machine, will process item: ' + item.id);

                    // trigger the event on next tick to give the event wiring time to complete
                    process.nextTick(function() {
                        _processItem(item);
                    });
                }
            });
            
            // delete the waiter
            delete _waiters[machine.id];
        }
    }
    
    // watch for new listener events
    machine.on('newListener', waitForProcessor);

    // initialise the waiter
    _waiters[machine.id] = {
        add: function(item) {
            items.push(item);
        }
    };
    
    return _waiters[machine.id];
} // _createWaiter

/* Item */

var Item = exports.Item = function(props, checkpoint) {
    var item = this;
    
    // default properties to an empty object
    props = props || {};
    
    // iterate through the data and copy to this
    Object.keys(props).forEach(function (property) {
        item[property] = props[property];
    });
    
    // initliase the machine to null
    this.machine = null;
    this.status = null;
    
    // ensure the item has an id
    this.id = this.id || ('item_' + (_itemCounter++));
    this.checkpoint = checkpoint;
};

util.inherits(Item, events.EventEmitter);

Object.keys(_exitCodes).forEach(function (status) {
    Item.prototype[status] = function(opts) {
        _leaveMachine(this, status, opts);
        return this;
    };
});

Item.prototype.process = function() {
    var item = this,
        machine = this.machine;
        
    if (machine) {
        // check for process listeners on the machine
        var listeners = machine.listeners('process'),
            waiter = _waiters[machine.id];
            
        // change the item status to ready
        machine.changeItemStatus(item, 'ready');
        
        // if we have listeners, then process the item, otherwise wait
        if (listeners.length) {
            _processItem(this);
        }
        // otherwise, watch for the machine to get a 'process' listener attached and then process
        else {
            debug('attempting to process item "' + item.id + '", but machine has no process events - waiting');
            
            if (! waiter) {
                // create a waiter for the machine
                waiter = _createWaiter(machine);
            }
            
            waiter.add(item);
        }
    }
    
    return this;
};

Item.prototype.enter = function(machine, previousMachine) {
    // check that the machine entry is ok
    if (this.machine && this.machine !== previousMachine) {
        throw new Error('Item "' + this.id + '" is attempting to enter a machine without leaving it\'s current machine first');
    }
    
    // set the current machine to the specified machine
    this.machine = machine;
    this.machine.changeItemStatus(this, 'waiting');

    // emit the enter event
    machine.emit('enter', this);
    
    return this;
};