<img src="https://github.com/DamonOehlman/changemachine/raw/master/assets/changemachine-logo.png" style="float: left; margin-right: 10px;" title="ChangeMachine" />

ChangeMachine is a critical component in the [Steelmesh stack](http://github.com/steelmesh).  It is responsible for monitoring and responding to changes in a number of couchdb instances and taking appropriate actions in response to those changes.

The implementation of ChangeMachine is reasonably simple thanks to the [flatiron neuron](https://github.com/flatiron/neuron) queueing library and through leveraging [changemate](https://github.com/steelmesh/changemate) notifiers. 

<a href="http://travis-ci.org/#!/steelmesh/changemachine"><img src="https://secure.travis-ci.org/steelmesh/changemachine.png" alt="Build Status"></a>

## Online Documentation

Documentation for changemachine is available at [changemachine.readthedocs.org](http://changemachine.readthedocs.org/)

## System Internals

- Attempts to act intelligently when a machine does not have a `process` event handler.  In this case, items are queued in the `ready` state and we make use of the [newListener](http://nodejs.org/docs/latest/api/events.html#event_newListener) node event to wait for a process event to be connected.  At this stage, similar action is not taken if the process listener is removed.

- Makes use of changemate notifier `pause` and `resume` methods to ensure efficient operation even in the case of a massive `_changes` feed from couch, etc.  In the case that a notifier does not support these operations, items will be queued.

### On ChangeMate vs Follow

While at the present stage an implementation of ChangeMachine would have been possible with the excellent [follow](https://github.com/iriscouch/follow) library the long term plan is to support monitoring changes from the filesystem and other sources so work changemate has been integrated instead.

## Alternative Systems

Some alternative systems that do similar things are:

- [banzai](https://github.com/pgte/banzai) - Banzai looks like an excellent system for processing documents through a number of various states.  Banzai's implementation has definitely influenced parts of ChangeMachine.

- [hook.io](http://hook.io/) - If you are building, loosely-coupled, distributed systems then hook.io is one of the best choices in the #nodejs space.  There are instances where ChangeMachine could perform a similar function to hook, but in most cases ChangeMachine is designed for simpler scenarios.

- [kue](https://github.com/Learnboost/kue) - Job processor built around redis, has a pretty admin panel to boot.

Additionally, as previously stated, ChangeMachine does not attempt to compete with full-blown messaging and queuing systems and if you require a more distributed system then be sure to check out the likes of RabbitMQ and 0MQ.
