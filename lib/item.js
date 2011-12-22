var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util');

var Item = exports.Item = function(props) {
    var item = this;
    
    // iterate through the data and copy to this
    Object.keys(props).forEach(function (property) {
        item[property] = props[property];
    });
};

util.inherits(Item, events.EventEmitter);

Item.prototype.done = function() {
    debug('item "' + (this.id || '') + '" done');
    this.emit('done');
};

Item.prototype.enter = function(machine) {
    debug('item "' + (this.id || '') + '" entering the machine');
    machine.emit('enter', this);
};