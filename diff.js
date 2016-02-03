var jpn = require('./JSON-Diff');

var f_old = require("./old.json");
var f_new = require("./new.json");


jpn.diff(f_old, f_new);