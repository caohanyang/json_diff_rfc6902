var jpn = require('./JSON-Diff');
var fs = require('fs');

var n_pathlogic = 20;

for (var i = 16; i <= n_pathlogic; i++) {
   console.log("Processing test case " + i);

   var root = "./tests/" + i + "/";

   var f_old = require(root + "old.json");
   var f_new = require(root + "new.json");

   var jpn_patch = jpn.diff(f_old, f_new);

   fs.writeFile(root + "jpn_patch.json", JSON.stringify(jpn_patch, null, 2));
}
