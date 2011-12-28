var debug = require('debug')('changemachine'),
    events = require('events'),
    util = require('util'),
    changemate = require('changemate'),
    neuron = require('neuron'),
    jobmanager = require('./jobmanager'),
    Item = require('./item').Item,
    _machineCounter = 0;
    
/* private helpers */

function _createNeuronJob(machine, machineId, opts) {
    // if the queue already exists, then throw an error
    // at this stage, changemachine supports only one machine per target
    if (jobmanager.jobs[machineId]) {
        throw new Error('Job queue already exists for machine id: ' + machineId + ', cannot create');
    }
    
    var job,
        queueCapacity = opts.queueCapacity || 0.5;
    
    jobmanager.addJob(machineId, {
        // pass through concurrency options
        concurrency: opts.concurrency,
        
        work: function(item, state) {
            // create a new item wrapping the worker and the data
            var worker = this,
                atCapacity = (job.queue.length / job.concurrency) > queueCapacity;
                
            // if we are at capacity, then pause the machine
            if (atCapacity && (! machine.paused)) {
                machine.emit('full', job.queue.length, job);
                
                debug('machine ' + machine.id + ' queue at capacity, pausing notifier');
                machine.pause();

                // once the job queue is empty, we will resume the notifier
                job.once('empty', function() {
                    debug('machine ' + machine.id + ' queue empty, resuming notifier');
                    machine.resume();
                });
            }

            // once the item has been completed, mark the worker as finished
            item.once('leave', function(status) {
                debug('captured item done, marking worker as finished, job queue length = ' + job.queue.length);
                worker.finished = true;
            });

            // start processing the item
            item.process();
        }
    });
    
    return job = jobmanager.jobs[machineId];
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
    
    _getState(machine.storage, target, function(state) {
        var job = machine.job;
        
        // create the notifier
        var notifier = changemate.watch(target, opts, state);

        // if we have a notifier, then handle the on change events
        notifier.on('change', function(data, state) {
            debug('detected change, queueing job for machine: ' + machine.id + ', ' + job.queue.length + ' items queued');
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
    this.storage = opts.storage;
    this.target = target;
    this.paused = false;
    
    // initialise the machine queue / job
    this.job = _createNeuronJob(this, this.id, opts);
    
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
    
    // set the checkpoint on defaults
    this.checkpointOn = {
        done: true,
        fail: false,
        skip: true
    };
    
    // set the leave on defaults
    // undefined values mean the item will leave on a status so only 
    // falsy values need to be specified
    this.leaveOn = {
        fail: false
    };
    
    // initialise the status queues
    this.statusQueues = {};
};

util.inherits(Machine, events.EventEmitter);

Machine.prototype.close = function() {
    // remove the job
    jobmanager.removeJob(this.id);
    
    // if we have a notifier and the notifier supports the close method call it
    if (this.notifier && this.notifier.close) {
        this.notifier.close();
    }
    
    this.emit('close');
}; // close

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

Machine.prototype.pause = function() {
    if (! this.paused) {
        this.paused = true;
        if (this.notifier && this.notifier.pause) {
            this.notifier.pause();
        }

        this.emit('pause');
    }
};

Machine.prototype.resume = function() {
    if (this.paused) {
        if (this.notifier && this.notifier.resume) {
            this.notifier.resume();
        }

        this.paused = false;
        this.emit('resume');
    }
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

Machine.prototype.saveCheckpoint = function(checkpoint) {
    // if we have both a state store and target, then update
    // TODO: investigate whether or not the state store should support 
    // storing state for manually created items (i.e. those without a target)
    debug('updating state, state store = ' + this.storage + ', target = ' + this.target);
    if (this.storage && this.target) {
        this.storage.update(this.target, checkpoint);
    }
};