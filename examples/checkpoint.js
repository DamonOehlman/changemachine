const cm = require('../');
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
