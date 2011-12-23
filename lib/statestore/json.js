var util = require('util'),
    StateStore = require('./base').StateStore;

var JsonStore = exports.JsonStore = function(targetFile) {
};

util.inherits(JsonStore, StateStore);