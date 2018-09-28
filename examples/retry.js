const cm = require('../');
const machine = new cm.Machine('<:couch:> http://fluxant.cloudant.com/seattle_neighbourhood', {
    concurrency: 25 // override neurons default concurrency of 50
});

machine.on('enter', function(item) {
    console.log('   entered: ' + item.id, machine.stats());
});

// perform actions for each of the
machine.on('process', function(item) {
    console.log('processing: ' + item.id, machine.stats());

    setTimeout(function() {
        item.fail();
    }, Math.random() * 500);
});

cm.autoretry(machine, {
    times: 5,
    wait: 1000
});
