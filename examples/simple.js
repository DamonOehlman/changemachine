var cm = require('../'),
    machine;
    
// set the job manager concurrency
cm.jobmanager.concurrency = 10;
machine = new cm.Machine('http://sidelab.iriscouch.com/seattle_neighbourhood');

// perform actions for each of the 
machine.on('enter', function(item) {
    console.log('item ' + item.id + ' has entered the machine');
    
    setTimeout(function() {
        item.done();
    }, Math.random() * 5000);
});

machine.on('leave', function(data) {
    
});