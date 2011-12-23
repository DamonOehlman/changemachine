var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    changemate = require('changemate'),
    neuron = require('neuron'),
    jobmanager = require('./jobmanager'),
    Item = require('./item').Item,
    _machineCounter = 0;
    
/* private helpers */

function _createNeuronJob(machineId, opts) {
    // if the queue does not exists already, then create it
    if (! jobmanager.jobs[machineId]) {
        var job;
        
        jobmanager.addJob(machineId, {
            // pass through concurrency options
            concurrency: opts.concurrency,
            
            work: function(item) {
                // create a new item wrapping the worker and the data
                var worker = this;

                // once the item has been completed, mark the worker as finished
                item.once('leave', function(status) {
                    debug('captured item done, marking worker as finished, job queue length = ' + job.queue.length);
                    worker.finished = true;
                });

                // start processing the item
                item.process();
            }
        });
        
        job = jobmanager.jobs[machineId];
    }
    
    return jobmanager.jobs[machineId];
} // _createJob

function _makeNotifier(machine, target, opts) {
    var notifier = target ? changemate.watch(target, opts) : null,
        queueCapacity = opts.queueCapacity || 0.5,
        job = machine.job;

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

        new Item(data).enter(machine);
    });
} // _makeNotifier
    
var Machine = exports.Machine = function(target, opts) {
    // ensure we have optsion
    opts = opts || {};
    
    // initialise the machine id
    var id = this.id = opts.id || 'machine_' + (_machineCounter++);
    
    // map the default targets from the options
    this.defaultTargets = opts.defaultTargets || {};
    
    // initialise the machine queue / job
    this.job = _createNeuronJob(this.id, opts);
    
    // get the changemate notifier that will be used to monitor the target
    this.notifier = _makeNotifier(this, target, opts);
    
    // when jobs enter the machine, queue the job
    this.on('enter', function(item) {
        jobmanager.enqueue(id, item);
    });
    
    // initialise the status queues
    this.statusQueues = {};
};

util.inherits(Machine, events.EventEmitter);

Machine.prototype.changeItemStatus = function(item, newStatus) {
    var oldQueue = this.statusQueues[item.status],
        newQueue = this.statusQueues[newStatus];
    
    // if the item has a current status, then look for the status queue and remove the item
    if (oldQueue) {
        oldQueue.splice(oldQueue.indexOf(item), 1);
    }
    
    // if the new queue is not defined, then create it now
    if (! newQueue) {
        newQueue = this.statusQueues[newStatus] = [];
    }
    
    // add the item to the new status queue
    newQueue.push(item);
    
    // update the item status
    item.status = newStatus;
}; 

Machine.prototype.stats = function() {
    var stats = {},
        machine = this;

    // add the length of the queues to the stats
    Object.keys(this.statusQueues).forEach(function(key) {
        stats[key] = machine.statusQueues[key].length;
    });
    
    return stats;
};