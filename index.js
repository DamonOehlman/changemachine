var Machine;

/**
  # changemachine

  <img src="https://github.com/DamonOehlman/changemachine/raw/master/assets/changemachine-logo.png" style="float: left; margin-right: 10px;" title="ChangeMachine" />

  ChangeMachine is a package built on top of
  ['changemate'](https://github.com/DamonOehlman/changemate) that can be
  used to take particular actions for updates listed in a couchdb `_changes`
  feed (or other changemate supported datasource - at this stage it's just CouchDB).

  Job queueing is handled using [flatiron neuron](https://github.com/flatiron/neuron).

  ## Example Usage

  The following is an example of how checkpointing using changemachine works:

  <<< examples/checkpoint.js

  After this has been run you should see a `checkpoint.json` file in the
  `examples/` folder with content that is telling changemachine where it is
  up to with processing the changes for the specified datasource. 

  ## Online Documentation

  Documentation for changemachine is available at
  [changemachine.readthedocs.org](http://changemachine.readthedocs.org/)

  ## System Internals

  - Attempts to act intelligently when a machine does not have a `process`
    event handler.  In this case, items are queued in the `ready` state and
    we make use of the
    [newListener](http://nodejs.org/docs/latest/api/events.html#event_newListener)
    node event to wait for a process event to be connected.  At this stage, similar
    action is not taken if the process listener is removed.

  - Makes use of changemate notifier `pause` and `resume` methods to ensure
    efficient operation even in the case of a massive `_changes` feed from
    couch, etc.  In the case that a notifier does not support these operations,
    items will be queued.

  ### On ChangeMate vs Follow

  While at the present stage an implementation of ChangeMachine would have been
  possible with the excellent [follow](https://github.com/iriscouch/follow) library
  the long term plan is to support monitoring changes from the filesystem and other
  sources so work changemate has been integrated instead.

  ## Alternative Systems

  Some alternative systems that do similar things are:

  - [banzai](https://github.com/pgte/banzai) - Banzai looks like an excellent
    system for processing documents through a number of various states.
    Banzai's implementation has definitely influenced parts of ChangeMachine.

  - [hook.io](http://hook.io/) - If you are building, loosely-coupled, distributed
    systems then hook.io is one of the best choices in the #nodejs space.  There
    are instances where ChangeMachine could perform a similar function to hook,
    but in most cases ChangeMachine is designed for simpler scenarios.

  - [kue](https://github.com/Learnboost/kue) - Job processor built around redis,
    has a pretty admin panel to boot.

  Additionally, as previously stated, ChangeMachine does not attempt to compete
  with full-blown messaging and queuing systems and if you require a more
  distributed system then be sure to check out the likes of RabbitMQ and 0MQ.
**/

exports = module.exports = function(target, opts) {
  return new Machine(target, opts);
};

Machine = exports.Machine = require('./lib/machine').Machine;

exports.repl = require('./lib/repl');
exports.Item = require('./lib/item').Item;

exports.autoretry = require('./lib/autoretry');

exports.CheckpointStore = require('./lib/storage/base').CheckpointStore;
exports.JsonStore = require('./lib/storage/json').JsonStore;


exports.jobmanager = require('./lib/jobmanager');
