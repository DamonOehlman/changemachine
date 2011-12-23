var cm = require('../'),
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