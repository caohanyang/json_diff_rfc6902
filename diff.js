var jpn = require('./JSON-Diff');
var fs = require('fs')

var f_old = require("./old1.json");
var f_new = require("./new1.json");


var jpn_patch = jpn.diff(f_old, f_new);

fs.writeFile("jpn_patch.json", JSON.stringify(jpn_patch, null, 2));