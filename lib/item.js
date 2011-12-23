var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    _itemCounter = 0;
    
/* private functions */

function _leaveMachine(item, status, nextMachine) {
    var currentMachine = item.machine;
    
    // if the item does not have a current machine, then throw an exception
    if (! currentMachine) {
        throw new Error('Item "' + item.id + '" is attempting to leave a machine, but has not entered one');
    }
    
    // set the default status to done
    status = status || 'done';
    debug('item "' + item.id + '" is leaving machine "' + currentMachine.id + '" with status: ' + status);
    
    // if the item has a machine, then trigger the event on the machine
    if (currentMachine) {
        currentMachine.emit(status, item);
        
        // if the machine has a default target machine for the status, then
        // fall back to that for the next machine
        nextMachine = nextMachine || currentMachine.defaultTargets[status];
    }
    
    // trigger the status event on the item
    item.emit(status);
    
    // also trigger the more generic leave machine
    item.emit('leave', status, currentMachine);
    
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
    
/* Item */

var Item = exports.Item = function(props) {
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
};

util.inherits(Item, events.EventEmitter);

Item.prototype.done = function(nextMachine) {
    _leaveMachine(this, 'done', nextMachine);
};

Item.prototype.fail = function(targetMachine) {
    _leaveMachine(this, 'fail', targetMachine);
};

Item.prototype.process = function() {
    var item = this,
        machine = this.machine;
        
    function waitForProcessor(eventName) {
        if (eventName === 'process') {
            // process the item (if the machine still matches)
            if (item.machine === machine) {
                _processItem(item);
            }
            
            // remove the listener
            machine.removeListener('newListener', waitForProcessor);
        }
    }
    
    if (machine) {
        // check for process listeners on the machine
        var listeners = machine.listeners('process');
        machine.changeItemStatus(item, 'ready');
        
        // if we have listeners, then process the item, otherwise wait
        if (listeners.length) {
            _processItem(this);
        }
        // otherwise, watch for the machine to get a 'process' listener attached and then process
        else {
            debug('attempting to process item "' + item.id + '", but machine has no process events - waiting');
            machine.on('newListener', waitForProcessor);
        }
    }
};

Item.prototype.enter = function(machine, previousMachine) {
    // check that the machine entry is ok
    if (this.machine && this.machine !== previousMachine) {
        throw new Error('Item "' + this.id + '" is attempting to enter a machine without leaving it\'s current machine first');
    }
    
    // set the current machine to the specified machine
    this.machine = machine;
    this.machine.changeItemStatus(this, 'entered');

    // emit the enter event
    machine.emit('enter', this);
};