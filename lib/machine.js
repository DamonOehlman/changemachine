var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    changemate = require('changemate'),
    neuron = require('neuron'),
    jobmanager = require('./jobmanager'),
    Item = require('./item').Item,
    _machineCounter = 0;
    
/* private helpers */

function _makeNotifier(machine, target, opts) {
    var notifier = target ? changemate.watch(target, opts) : null,
        queueCapacity = opts.queueCapacity || 0.5,
        job;

    // if the queue does not exists already, then create it
    if (! jobmanager.jobs[machine.id]) {
        jobmanager.addJob(machine.id, {
            // pass through concurrency options
            concurrency: opts.concurrency,
            
            work: function(data) {
                // create a new item wrapping the worker and the data
                var worker = this,
                    item = new Item(worker, data);

                // once the item has been completed, mark the worker as finished
                item.once('done', function() {
                    debug('captured item done, marking worker as finished, job queue length = ' + job.queue.length);
                    worker.finished = true;
                });
                
                // have the item enter the machine
                item.enter(machine);
            }
        });
    }
    
    // get the queue
    job = jobmanager.jobs[machine.id];
    
    // if we have a notifier, then handle the on change events
    notifier && notifier.on('change', function(data) {
        var atCapacity = (job.queue.length / job.concurrency) > queueCapacity;

        debug('detected change, queueing job for machine: ' + machine.id + ', ' + job.queue.length + ' items queued, at capacity = ' + atCapacity);

        // if the queue is at capacity, and the notifier supports pausing then let's pause it
        if (atCapacity && notifier.pause && (! notifier.paused)) {
            debug('machine ' + machine.id + ' queue at capacity, pausing notifier');
            notifier.pause();

            // once the job queue is empty, we will resume the notifier
            job.once('empty', function() {
                debug('machine ' + machine.id + ' queue empty, resuming notifier');
                notifier.resume();
            });
        }

        jobmanager.enqueue(machine.id, data);
    });
} // _makeNotifier
    
var Machine = exports.Machine = function(target, opts) {
    // ensure we have optsion
    opts = opts || {};
    
    // initialise the machine id
    this.id = opts.id || 'machine_' + (_machineCounter++);
    
    // get the changemate notifier that will be used to monitor the target
    this.notifier = _makeNotifier(this, target, opts);
};

util.inherits(Machine, events.EventEmitter);