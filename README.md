# changemachine

The changemachine is a critical component in the [Steelmesh stack](http://github.com/steelmesh).  It is responsible for monitoring and responding to changes in a number of couchdb instances and taking appropriate actions in response to those changes.

The implementation of changemachine is reasonably simple thanks to the [flatiron neuron](https://github.com/flatiron/neuron) queueing library and through leveraging [changemate](https://github.com/steelmesh/changemate) changemate notifiers.  While at the present stage an implementation of changemachine would have been possible with the excellent [follow](https://github.com/iriscouch/follow) library the long term plan is to support monitoring changes from the filesystem and other sources so work changemate has been integrated instead.

## Usage

The following code snippets are taken from the examples in the repository:

### Simple Example using Changemate Notifier

This simple example demonstrates responding to changes from an external couchdb:

```js
var cm = require('changemachine'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        concurrency: 25 // override neurons default concurrency of 50
    });

machine.on('enter', function(item) {
    console.log('   entered: ' + item.id, machine.stats());
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

If it is all working nicely, you should see output similar to [this](https://github.com/steelmesh/changemachine/blob/master/examples/simple.output.txt).

### Simple Example demonstrating `ready` queue

In the example above, items existed in either the `waiting` or `processing` queues.  This because the machine had a `process` event that could be used to process the items as they enter the machine.  In a case where a `process` event handler is not defined, however, the items ready for processing (according to neuron's concurrency setting) will be placed in the `ready` queue.

Let's modify the previous example to wire up the process event after 5 seconds:

```js
var cm = require('../'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        concurrency: 25 // override neurons default concurrency of 50
    });
    
machine.on('enter', function(item) {
    console.log('   entered: ' + item.id, machine.stats());
});

setTimeout(function() {
    // perform actions for each of the 
    machine.on('process', function(item) {
        console.log('processing: ' + item.id, machine.stats());

        setTimeout(function() {
            item.done();
            console.log('      done: ' + item.id, machine.stats());
        }, Math.random() * 5000);
    });
}, 5000);
```

In the [output](https://github.com/steelmesh/changemachine/blob/master/examples/delayedprocess.output.txt) for this example, you should see that before processing starts a number of items are reported in the `ready` queue.  Once the `process` event is connected however, the items move directly from a `waiting` status to `processing`.

### Non Notifier Change Machines

While changemachine is designed to work in conjuction with [changemate](https://github.com/steelmesh/changemate), it is possible to create items and process them manually also.

### Serializing Data from CouchDB

If you wanted to extract all the JSON data from documents in a couch database (not the attachments though - although it could be combined with [attachmate](https://github.com/steelmesh/attachmate) to achieve that) the following example is probably of interest:

```js
var cm = require('changemate'),
    fs = require('fs'),
    path = require('path'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        include_docs: true,
        concurrency: 10 // override neurons default concurrency of 50
    }),
    dataPath = path.resolve(__dirname, 'data');
    
// perform actions for each of the 
console.log('waiting for change information');
machine.on('process', function(item) {
    try {
        var text = JSON.stringify(item.doc);
        
        fs.writeFile(path.join(dataPath, item.id + '.json'), text, 'utf8', function(err) {
            if (err) {
                item.fail(err);
            }
            else {
                item.done();
            }
            
            console.log('wrote ' + item.id + '.json', machine.stats());
        });
    }
    catch (e) {
        console.log('failed writing: ' + item.id, e);
        item.fail(e);
    }
});
```

```
To be completed
```

### Machine Chaining

```
To be completed
```

## System Internals

- Attempts to act intelligently when a machine does not have a `process` event handler.  In this case, items are queued in the `ready` state and we make use of the [newListener](http://nodejs.org/docs/latest/api/events.html#event_newListener) node event to wait for a process event to be connected.  At this stage, similar action is not taken if the process listener is removed.

- Makes use of changemate notifier `pause` and `resume` methods to ensure efficient operation even in the case of a massive `_changes` feed from couch, etc.  In the case that a notifier does not support these operations, items will be queued.

## Alternative Systems

Some alternative systems that do similar things are:

- [banzai](https://github.com/pgte/banzai) - Banzai looks like an excellent system for processing documents through a number of various states.  Banzai's implementation has defintely influenced parts of changemachine.

- [hook.io](http://hook.io/) - If you are building, loosely-coupled, distributed systems then hook.io is one of the best choices in the #nodejs space.  There are instances where changemachine could perform a similar function to hook, but in most cases changemachine is designed for simpler scenarios.
