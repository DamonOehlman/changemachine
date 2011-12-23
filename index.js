var Machine;

exports = module.exports = function(target, opts) {
    return new Machine(target, opts);
};

Machine = exports.Machine = require('./lib/machine').Machine;

exports.Item = require('./lib/item').Item;

exports.StateStore = require('./lib/statestore/base').StateStore;
exports.JsonStore = require('./lib/statestore/json').JsonStore;


exports.jobmanager = require('./lib/jobmanager');