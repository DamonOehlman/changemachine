var cm = require('changemachine'),
    machine = new cm.Machine('<:couch:> http://sidelab.iriscouch.com/seattle_neighbourhood');

cm.repl(8888);