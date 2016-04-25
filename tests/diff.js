var jdr = require('../JSON-Diff');
var fs = require('fs');
var fjp = require('fast-json-patch');
var jiff = require('jiff');
var jsondiffpatch = require('jsondiffpatch');
var jiff_options = { invertible: false };
var json8 = require('json8-patch');
var rfc6902 = require('rfc6902');

var n_pathlogic = 20;

for (var i = 1; i <= n_pathlogic; i++) {
  console.log("Processing test case " + i);

  var root = "./" + i + "/";
  var f_old = require(root + "old.json");
  var app_old = JSON.parse(JSON.stringify(f_old));
  var old_ori = JSON.parse(JSON.stringify(f_old));
  var f_new = require(root + "new.json");

  // var exp_patch = require(root + "expected.json");
  console.time("jdr-diff");
  // var jdr_patch = jdr.diff(f_old, f_new);  , HASH_ID: "title"
  var jdr_patch = jdr.diff(f_old, f_new, {OBJ_COM: true, ARR_COM: true});
  console.timeEnd("jdr-diff");

  console.time("jiff-diff");
  var jiff_patch = jiff.diff(f_old, f_new, jiff_options);
  console.timeEnd("jiff-diff");
  console.time("fjp-diff");
  var fjp_patch = fjp.compare(f_old, f_new);
  console.timeEnd("fjp-diff");
  console.time("jdp-diff");
  var jdp_patch = jsondiffpatch.diff(f_old, f_new);
  console.timeEnd("jdp-diff");
  console.time("rfc6902");
  var rfc6902_patch = rfc6902.createPatch(f_old, f_new);
  console.timeEnd("rfc6902");
  console.time("json8");
  var json8_patch = json8.diff(f_old, f_new);
  console.timeEnd("json8");

  // Use fjp to apply the patch fjp_patch jdr_patch jiff_patch
  fjp.apply(f_old, fjp_patch);

  jdr.apply(app_old, jdr_patch);

  fs.writeFile(root + "jdr_patch.json", JSON.stringify(jdr_patch, null, 2));
  fs.writeFile(root + "fjp_patch.json", JSON.stringify(fjp_patch, null, 2));
  fs.writeFile(root + "jiff_patch.json", JSON.stringify(jiff_patch, null, 2));
  fs.writeFile(root + "rfc6902_patch.json", JSON.stringify(rfc6902_patch, null, 2));
  fs.writeFile(root + "json8_patch.json", JSON.stringify(json8_patch, null, 2));
  fs.writeFile(root + "fjp_new.json", JSON.stringify(f_old, null, 2));
  fs.writeFile(root + "jdr_new.json", JSON.stringify(app_old, null, 2));
  fs.writeFile(root + "new_ori.json", JSON.stringify(f_new, null, 2));
  fs.writeFile(root + "old_ori.json", JSON.stringify(old_ori, null, 2));

}
