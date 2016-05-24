# changemachine

<img src="https://github.com/DamonOehlman/changemachine/raw/master/assets/changemachine-logo.png" style="float: left; margin-right: 10px;" title="ChangeMachine" />

ChangeMachine is a package built on top of
['changemate'](https://github.com/DamonOehlman/changemate) that can be
used to take particular actions for updates listed in a couchdb `_changes`
feed (or other changemate supported datasource - at this stage it's just CouchDB).

Job queueing is handled using [flatiron neuron](https://github.com/flatiron/neuron).


[![NPM](https://nodei.co/npm/changemachine.png)](https://nodei.co/npm/changemachine/)

[![unstable](https://img.shields.io/badge/stability-unstable-yellowgreen.svg)](https://github.com/dominictarr/stability#unstable) [![Build Status](https://api.travis-ci.org/DamonOehlman/changemachine.svg?branch=master)](https://travis-ci.org/DamonOehlman/changemachine) [![bitHound Score](https://www.bithound.io/github/DamonOehlman/changemachine/badges/score.svg)](https://www.bithound.io/github/DamonOehlman/changemachine) 

## Example Usage

The following is an example of how checkpointing using changemachine works:

```js
const cm = require('changemachine');
const path = require('path');
const sourceUrl = '<:couch:> http://fluxant.cloudant.com/seattle_neighbourhood'

// create a new changemachine instance that will read updates from a remote db
const machine = new cm.Machine(sourceUrl, {
  // as updates are processed, we will keep a checkpoint of whether we are up
  // to using the following changemachine storage
  storage: new cm.JsonStore({ filename: path.resolve(__dirname, 'checkpoint.json') })
});

let counter = 0;

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

## License(s)

### MIT

Copyright (c) 2016 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
