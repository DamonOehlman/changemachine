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
    var notifier = changemate.watch(target, opts),
        queueName = 'machine_queue_' + (opts.id || _machineCounter++),
        queueCapacity = opts.queueCapacity || 0.5,
        job;

    // if the queue does not exists already, then create it
    if (! jobmanager.jobs[queueName]) {
        jobmanager.addJob(queueName, {
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
    job = jobmanager.jobs[queueName];
    
    // when we receive a change add that to the queue
    notifier.on('change', function(data) {
        var atCapacity = (job.queue.length / job.concurrency) > queueCapacity;
        
        debug('detected change, queueing job in queue: ' + queueName + ', ' + job.queue.length + ' items queued, at capacity = ' + atCapacity);
        
        // if the queue is at capacity, and the notifier supports pausing then let's pause it
        if (atCapacity && notifier.pause && (! notifier.paused)) {
            debug('queue ' + queueName + ' at capacity, pausing notifier');
            notifier.pause();
            
            // once the job queue is empty, we will resume the notifier
            job.once('empty', function() {
                debug('queue ' + queueName + ' empty, resuming notifier');
                notifier.resume();
            });
        }
        
        jobmanager.enqueue(queueName, data);
    });
} // _makeNotifier
    
var Machine = exports.Machine = function(target, opts) {
    // ensure we have optsion
    opts = opts || {};
    
    // get the changemate notifier that will be used to monitor the target
    this.notifier = _makeNotifier(this, target, opts);
};

util.inherits(Machine, events.EventEmitter);