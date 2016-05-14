var jsonpatch = require('fast-json-patch'),
jiff = require('jiff'),
rfc6902 = require('rfc6902'),
jdr = require('json-diff-rfc6902'),
json8 = require('json8-patch'),
fs = require('fs'),
now = require("performance-now");

var versionNum = 14;
var repeat = 100;

// "Xignite" , "Stackoverflow", "Twitter"
var data = ["Twitter"];
var algorithm = [0, 1, 2, 3, 4, 5];

for (var i = 0; i < data.length; i++) {
   console.log("Processing case " + data[i]);
   var root = "./" + data[i] + "/";
   // Write title
   var title = data[i]+',A0_DT,A0_PS,A1_DT,A1_PS,A2_DT,A2_PS,A3_DT,A3_PS,A4_DT,A4_PS,A5_DT,A5_PS' + '\n';
   fs.writeFile(root + data[i] +'.csv', title, {flag: 'a'} );

   for (var j = 1; j <= versionNum; j++) {

     var f_old = require(root+ "new_" + (j-1) + ".json");
     var f_new = require(root + "new_" + j + ".json");

     generatePatch(root, data[i], f_old, f_new, j, algorithm);

    }
}


function generatePatch(root, data, f_old, f_new, version, algorithm) {

  var delta, diffStartTime, diffEndTime, result, deltaSize;

  for (var a = 0; a < algorithm.length; a++) {

    diffStartTime = now();
    switch (algorithm[a]) {
      case 1:
      for(var m = 0; m < repeat; m++) {
        delta = jsonpatch.compare(f_old, f_new);
      }
      break;
      case 2:
      for(var m = 0; m < repeat; m++) {
        delta = jiff.diff(f_old, f_new, {invertible: false});
      }
      break;
      case 3:
      for(var m = 0; m < repeat; m++) {
        delta = jdr.diff(f_old, f_new);
      }
      break;
      case 4:
      for(var m = 0; m < repeat; m++) {
        delta = rfc6902.createPatch(f_old, f_new);
      }
      break;
      case 5:
      for(var m = 0; m < repeat; m++) {
        delta = json8.diff(f_old, f_new);
      }
      break;

    }

    diffEndTime = now();


    if (delta != undefined) {
      deltaSize = getBinarySize(JSON.stringify(delta));
      // deltaSize = JSON.stringify(delta).length;
    } else {
      // A0
      deltaSize = getBinarySize(JSON.stringify(f_new));
    }

    if(algorithm[a] === 0) {
      result =  'diff'+ j +','+'0' + ','+ deltaSize + ',';
    } else {
      result = ((diffEndTime - diffStartTime).toFixed(2) / repeat) + ',' + deltaSize + ',';
    }
    if(algorithm[a] === 5) {
      result = result + '\n';
    }


    fs.writeFile(root + data +'.csv', result, {flag: 'a'});

  }

  // fs.writeFile(root + algo +"_patch_" + version + ".json", JSON.stringify(delta, null, 2));

}


function getBinarySize(string) {
    return Buffer.byteLength(string, 'utf8');
}
