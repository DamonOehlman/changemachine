<img src="https://github.com/steelmesh/changemachine/raw/master/assets/changemachine-logo.png" style="float: left; margin-right: 10px;" title="ChangeMachine" />

ChangeMachine is a critical component in the [Steelmesh stack](http://github.com/steelmesh).  It is responsible for monitoring and responding to changes in a number of couchdb instances and taking appropriate actions in response to those changes.

The implementation of ChangeMachine is reasonably simple thanks to the [flatiron neuron](https://github.com/flatiron/neuron) queueing library and through leveraging [changemate](https://github.com/steelmesh/changemate) notifiers. 

<a href="http://travis-ci.org/#!/steelmesh/changemachine"><img src="https://secure.travis-ci.org/steelmesh/changemachine.png" alt="Build Status"></a>

## Getting Started

ChangeMachine is designed to work in similar fashion to manufacturing plant, whereby a plant is made up of many machines that perform a single function, and items (or materials) enter the machine, get processed and leave the machine.

In most cases, a machine processes an item successfully:

```js
machine.on('process', function(item) {
	// do something with the item
	
	// mark the item as done
	item.done();
});
```

But sometimes things can go wrong:

```js
machine.on('process', function(item) {
	try {
		// do something with the item
		
		// mark the item as done
		item.done();
	}
	catch (e) {
		// mark the item as failed
		item.fail({ error: e });
	}
});
```

Additionally, sometimes you might receive an error when something is done but not want to have to call a separate fail function.  You can do this by passing an error in the options for any of the `done`, `fail` or `skip` methods and the status will be remapped to `fail`:

```js
machine.on('process', function(item) {
	// write the item data to a file
	writeItemData(item, function(err) {
		item.done({ error: err });
	});
});
```

Regardless of how you flag that an item has failed, you probably want to know about it:

```
machine.on('fail', function(item, err) {
	console.log('got a failed item: ' + item.id);
});
```

## Examples

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
var cm = require('changemachine'),
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

### State Storage

At this stage ChangeMachine implements very simple state storage, but it works nicely and event attempts to synchronously persist data when the process `exit` event is detected.

Below is an example that demonstrates how a state store is configured:

```js
var cm = require('changemachine'),
    path = require('path'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        stateStore: new cm.JsonStore({ filename: path.resolve(__dirname, 'state.json') })
    }),
    counter = 0;
    
// perform actions for each of the 
machine.on('process', function(item) {
    console.log('processing item sequence: ' + item.seq);
    
    counter++;
    item.done();
    
    // if we have processed 10 items, then stop
    if (counter >= 10) {
        machine.notifier.close();
    }
});
```

### Serializing Data from CouchDB

If you wanted to extract all the JSON data from documents in a couch database (not the attachments though - although it could be combined with [attachmate](https://github.com/steelmesh/attachmate) to achieve that) the following example is probably of interest:

```js
var cm = require('changemachine'),
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

### Non Notifier Change Machines

While ChangeMachine is designed to work in conjuction with [changemate](https://github.com/steelmesh/changemate), it is possible to create items and process them manually also.

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

### On ChangeMate vs Follow

While at the present stage an implementation of ChangeMachine would have been possible with the excellent [follow](https://github.com/iriscouch/follow) library the long term plan is to support monitoring changes from the filesystem and other sources so work changemate has been integrated instead.

## Alternative Systems

Some alternative systems that do similar things are:

- [banzai](https://github.com/pgte/banzai) - Banzai looks like an excellent system for processing documents through a number of various states.  Banzai's implementation has definitely influenced parts of ChangeMachine.

- [hook.io](http://hook.io/) - If you are building, loosely-coupled, distributed systems then hook.io is one of the best choices in the #nodejs space.  There are instances where ChangeMachine could perform a similar function to hook, but in most cases ChangeMachine is designed for simpler scenarios.

- [kue](https://github.com/Learnboost/kue) - Job processor built around redis, has a pretty admin panel to boot.

Additionally, as previously stated, ChangeMachine does not attempt to compete with full-blown messaging and queuing systems and if you require a more distributed system then be sure to check out the likes of RabbitMQ and 0MQ.
