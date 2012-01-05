var debug = require('debug')('changemachine'),
    util = require('util');

module.exports = function(machine, opts) {
    // ensure we have options
    opts = opts || {};
    opts.times = opts.times || 3; // default 5 times
    opts.wait = typeof opts.wait != 'undefined' ? opts.wait : 30000; // default 30 seconds
    
    //  set the remove failed to be the default
    opts.removeFailed = typeof opts.removeFailed == 'undefined' || opts.removeFailed;
    
    debug('setting up auto retry on machine: ' + machine.id + ', opts = ' + util.inspect(opts));
    
    machine.on('fail', function(item) {
        // increment the item attempt index (0 / undefined = first attempt, 1 = 2nd, etc)
        debug('captured item fail: ' + item.id + ', attempt = ' + item.attempt);
        
        // if the item attempt is greater than or equal to the number of retry times, then remove it
        if (item.attempt >= opts.times) {
            if (opts.removeFailed) {
                item.emit('leave', 'fail');
            }
        }
        // otherwise, retry processing after the specified wait time
        else {
            setTimeout(function() {
                item.process();
            }, opts.wait);
        }
    });
};