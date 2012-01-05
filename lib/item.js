var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    _exitCodes = {
        done: {},
        fail: {},
        skip: {}
    },
    _itemCounter = 0,
    _waiters = {};
    
// ## Helper Functions

// ### _createWaiter
// The `_createWaiter` function is used to create a "holding area" for jobs on the machine
// prior to the machine have a `process` event handler defined.
function _createWaiter(machine) {
    var items = [];
    
    function flushWaiter() {
        // remove the listener
        machine.removeListener('newListener', waitForProcessor);

        items.forEach(function(item) {
            // process the item (if the machine still matches)
            if (item.machine === machine) {
                debug('captured process event being added to the machine, will process item: ' + item.id);

                // trigger the event on next tick to give the event wiring time to complete
                process.nextTick(function() {
                    item.process();
                });
            }
        });
        
        // delete the waiter
        delete _waiters[machine.id];
    }
    
    function waitForProcessor(eventName) {
        if (eventName === 'process') {
            flushWaiter();
        }
    }
    
    // watch for new listener events
    machine.on('newListener', waitForProcessor);
    if (machine.paused) {
        machine.once('resume', flushWaiter);
    }

    // initialise the waiter
    _waiters[machine.id] = {
        add: function(item) {
            items.push(item);
        }
    };
    
    return _waiters[machine.id];
} // _createWaiter

// ## Item Prototype
// The `Item` prototype is used to describe items that will be passed through a machine.

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
    this.attempt = 0;
};

// inherit `EventEmitter` prototype
util.inherits(Item, events.EventEmitter);

// map the various status types to call changeStatus
Object.keys(_exitCodes).forEach(function (status) {
    Item.prototype[status] = function(opts) {
        return this.changeStatus(status, opts);
    };
});

// ### changeStatus(newStatus, opts*)
// The `changeStatus` method is called under the hood when methods like `item.done()` and
// `item.fail()` are called.  The function is used to move the item from one status to another
// within the machine and correctly move the item between machines depending on those state
// changes.
Item.prototype.changeStatus = function(status, opts) {
    var currentMachine = this.machine,
        nextMachine,
        exitOpts = _exitCodes[status],
        leaving,
        statusArgs = [];
        
    // ensure we have options
    opts = opts || {};
    
    // if the item does not have a current machine, then throw an exception
    if (! currentMachine) {
        throw new Error('Item "' + this.id + '" is attempting to leave a machine, but has not entered one');
    }
    
    // if we captured an error, then the status should be fail
    if (opts.error) {
        status = 'fail';
    }
    
    // flag whether the item should be checkpointed or not
    // if not specified, look at the autoCheckpoint value, otherwise use the value specified
    opts.checkpoint = typeof opts.checkpoint == 'undefined' ? currentMachine.checkpointOn[status] : opts.checkpoint;
    
    // determine whether or not the item is leaving the current machine or not
    // by default, a status change means the item will move on to the next machine (if defined)
    // therefore, unless a status has an explicit leaveOn[status] set to false the item will leave
    leaving = currentMachine.leaveOn[status] || typeof currentMachine.leaveOn[status] == 'undefined';
    debug('item "' + this.id + '" is changing status to "' + status + '", leaving = ' + leaving);
    
    // checkpoint the item if appropriate
    if (this.checkpoint && opts.checkpoint) {
        debug('saving item checkpoint');
        currentMachine.saveCheckpoint(this.checkpoint);
    }
    
    // update the item status, passing the leaving value through for a removal status flag
    this.machine.changeItemStatus(this, status);
    
    // if the status is fail, then provide the error as the second argument
    if (status === 'fail') {
        statusArgs.push(opts.error);
    }
    
    // append additional arguments to the status args
    statusArgs = statusArgs.concat(Array.prototype.slice.call(arguments, 3));
    
    // emit the status event for the machine
    currentMachine.emit.apply(currentMachine, [status, this].concat(statusArgs));
    
    // trigger the status event on the item
    this.emit.apply(this, [status].concat(statusArgs));

    // if the item is leaving the machine, then find the next machine
    if (leaving) {
        // if the machine has a default target machine for the status, then
        // fall back to that for the next machine
        nextMachine = opts.next || currentMachine.defaultTargets[status];

        // also trigger the more generic leave machine
        this.emit('leave', status, currentMachine);
    }
    
    // if we have a next machine, then enter that machine
    if (nextMachine) {
        this.enter(nextMachine, currentMachine);
    }
    // otherwise if the item is leaving the machine, clear the item machine reference
    else if (leaving) {
        this.machine = null;
    }
};

// ### process
Item.prototype.process = function() {
    var item = this,
        machine = this.machine;
        
    if (machine) {
        // check for process listeners on the machine
        var listeners = machine.listeners('process'),
            waiter = _waiters[machine.id],
            // we are ok to process the item if it is currently being processed
            okToProcess = true; // machine.isProcessing(this);
            
        // if we have listeners and the machine is not paused, 
        // then process the item, otherwise wait
        if (listeners.length && okToProcess) {
            debug('processing item "' + this.id + '" (attempt ' + this.attempt + ')');

            // change the item status to processing
            this.machine.changeItemStatus(this, 'processing');

            // emit the `process` event on the machine
            // this event should do something with the item and mark it change it's status
            this.attempt += 1;
            this.machine.emit('process', this);
        }
        // otherwise, watch for the machine to get a 'process' listener attached and then process
        else {
            debug('attempting to process item "' + item.id + '", but machine has no process events or paused - waiting');
            
            // change the item status to ready
            machine.changeItemStatus(item, 'ready');

            if (! waiter) {
                // create a waiter for the machine
                waiter = _createWaiter(machine);
            }
            
            waiter.add(item);
        }
    }
    
    return this;
};

// ### enter(machine, previousMachine)
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