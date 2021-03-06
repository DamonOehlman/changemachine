// ChangeMachine interface with [neuron](https://github.com/flatiron/neuron) queuing library.
var neuron = require('neuron'),
    util = require('util');

function JobManager() {
    neuron.JobManager.call(this);
} // JobManager

util.inherits(JobManager, neuron.JobManager);

JobManager.prototype.useCache = function(opts) {
    this.cache = new neuron.WorkerCache(opts);
};

// create a single instance of the job manager
module.exports = new JobManager();