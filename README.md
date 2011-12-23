# changemachine

The changemachine is a critical component in the [Steelmesh stack](http://github.com/steelmesh).  It is responsible for monitoring and responding to changes in a number of couchdb instances and taking appropriate actions in response to those changes.

The implementation of changemachine is reasonably simple thanks to the [Neuron](https://github.com/flatiron/neuron) queueing library and through leveraging [changemate](https://github.com/steelmesh/changemate) changemate notifiers.  While at the present stage an implementation of changemachine would have been possible with the excellent [follow](https://github.com/iriscouch/follow) library the long term plan is to support monitoring changes from the filesystem and other sources so work changemate has been integrated instead.

## Usage

The following code snippets are taken from the examples in the repository:

### Simple Example using Changemate Notifier

This simple example demonstrates responding to changes from an external couchdb:

```js
var cm = require('changemachine'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        concurrency: 10 // override neurons default concurrency of 50
    });
    
// perform actions for each of the 
machine.on('process', function(item) {
    console.log('processing: ' + item.id, machine.stats());

    setTimeout(function() {
        item.done();
        console.log('      done: ' + item.id, machine.stats());
    }, Math.random() * 5000);
});
```

## System Internals

- Attempts to act intelligently when a machine does not have a `process` event handler.  In this case, items are queued in the `ready` state and we make use of the [newListener](http://nodejs.org/docs/latest/api/events.html#event_newListener) node event to wait for a process event to be connected.  At this stage, similar action is not taken if the process listener is removed.

- Makes use of changemate notifier `pause` and `resume` methods to ensure efficient operation even in the case of a massive `_changes` feed from couch, etc.  In the case that a notifier does not support these operations, items will be queued.

## Alternative Systems

Some alternative systems that do similar things are:

- [banzai](https://github.com/pgte/banzai)

