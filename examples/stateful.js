var cm = require('../'),
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