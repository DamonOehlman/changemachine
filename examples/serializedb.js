var cm = require('../'),
    fs = require('fs'),
    path = require('path'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood', {
        include_docs: true,
        concurrency: 10 // override neurons default concurrency of 50
    }),
    dataPath = path.resolve(__dirname, 'data');
    
// make the data directory
fs.mkdir(dataPath);

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