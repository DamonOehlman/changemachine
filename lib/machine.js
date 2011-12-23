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
            
            work: function(item, state) {
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

function _getState(store, target, callback) {
    // if we don't have a store, then fire the callback with no data
    if (! store) {
        callback();
    }
    else {
        store.retrieve(target, callback);
    }
};

function _makeNotifier(machine, target, opts, callback) {
    debug('machine has target "' + target + '", configuring notifier');
    
    _getState(machine.stateStore, target, function(state) {
        var queueCapacity = opts.queueCapacity || 0.5,
            job = machine.job;
        
        // create the notifier
        var notifier = changemate.watch(target, opts, state);

        // if we have a notifier, then handle the on change events
        notifier.on('change', function(data, state) {
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

            new Item(data, state).enter(machine);
        });
        
        // return the notifier
        callback(notifier);
    });
} // _makeNotifier
    
var Machine = exports.Machine = function(target, opts) {
    // ensure we have optsion
    opts = opts || {};
    
    // initialise the machine id
    var id = this.id = opts.id || 'machine_' + (_machineCounter++),
        machine = this;
    
    // map the default targets from the options
    this.defaultTargets = opts.defaultTargets || {};
    this.stateStore = opts.stateStore;
    this.target = target;
    
    // initialise the machine queue / job
    this.job = _createNeuronJob(this.id, opts);
    
    // get the changemate notifier that will be used to monitor the target
    if (this.target) {
        _makeNotifier(this, target, opts, function(notifier) {
            machine.notifier = notifier;
        });
    }
    
    // when jobs enter the machine, queue the job
    this.on('enter', function(item) {
        jobmanager.enqueue(id, item);
    });
    
    // initialise the status queues
    this.statusQueues = {};
};

util.inherits(Machine, events.EventEmitter);

Machine.prototype.changeItemStatus = function(item, newStatus, removal) {
    var oldQueue = this.statusQueues[item.status],
        newQueue = this.statusQueues[newStatus];
    
    // if the item has a current status, then look for the status queue and remove the item
    if (oldQueue) {
        oldQueue.splice(oldQueue.indexOf(item), 1);
    }
    
    // if this is not a removal status, then add to the new queue
    if (! removal) {
        // if the new queue is not defined, then create it now
        if (! newQueue) {
            newQueue = this.statusQueues[newStatus] = [];
        }

        // add the item to the new status queue
        newQueue.push(item);
    }
    
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

Machine.prototype.updateState = function(state) {
    // if we have both a state store and target, then update
    // TODO: investigate whether or not the state store should support 
    // storing state for manually created items (i.e. those without a target)
    debug('updating state, state store = ' + this.stateStore + ', target = ' + this.target);
    if (this.stateStore && this.target) {
        this.stateStore.update(this.target, state);
    }
};