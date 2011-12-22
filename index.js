var Machine;

exports = module.exports = function(target, opts) {
    return new Machine(target, opts);
};

Machine = exports.Machine = require('./lib/machine').Machine;

exports.jobmanager = require('./lib/jobmanager');