var cm = require('../'),
    machine;
    
// set the job manager concurrency
cm.jobmanager.concurrency = 10;
machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');

// perform actions for each of the 
machine.on('process', function(item) {
    console.log('item ' + item.id + ' is being processed');
    
    setTimeout(function() {
        console.log('item ' + item.id + ' is done');
        item.done();
    }, Math.random() * 5000);
});

machine.on('leave', function(data) {
    
});