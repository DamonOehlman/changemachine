var Machine;

exports = module.exports = function(target, opts) {
    return new Machine(target, opts);
};

Machine = exports.Machine = require('./lib/machine').Machine;

exports.Item = require('./lib/item').Item;

exports.CheckpointStore = require('./lib/storage/base').CheckpointStore;
exports.JsonStore = require('./lib/storage/json').JsonStore;


exports.jobmanager = require('./lib/jobmanager');