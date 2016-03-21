var applyPatches = require('./applyPatches');
var lcs = require('./LCS.js');
var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');
// var hash = require('string-hash');

exports.diff = diff;
exports.apply = apply;

// browserify -s jdr -e JSON-Diff.js -o json-diff-rfc6902.js

function apply(app_old, jpn_patch) {
  applyPatches.apply(app_old, jpn_patch);
}

function diff(oldJson, newJson) {

  // Get the unchanged area
  var unchanged = [];
  //unchangedArea.generateUnchanged(oldJson, newJson, unchanged, '');

  // Generate the diff
  var patches = [];
  generateDiff(oldJson, newJson, unchanged, patches, '');
  patchArea.handlePatch(patches);

  return patches;
}

function generateDiff(oldJson, newJson, unchanged, patches, path) {

  // var a = null  object     Array.isArray: false
  // var a = 5     number
  // var a = [1,2] object     Array.isArray: true
  // var a         undefined  Array.isArray: false
  if (Array.isArray(oldJson) && Array.isArray(newJson)) {
    generateArrayDiff(oldJson, newJson, unchanged, patches, path);
    return;
  }

  if (typeof oldJson === "object" && oldJson !== null && typeof newJson === "object"  && newJson !== null) {
    generateObjectDiff(oldJson, newJson, unchanged, patches, path);
    return;
  }

  return generateValueDiff(oldJson, newJson, unchanged, patches, path);
}

function generateValueDiff(oldJson, newJson, unchanged, patches, path) {
  // the endpoint
  if (newJson !== oldJson) {
    // console.log({ op: "replace", path: path, value: copy.clone(newJson)});
    patches.push(hashObject({ op: "replace", path: path, value: newJson}));
  }

}

function generateArrayDiff(oldJson, newJson, unchanged, patches, path) {
  // console.log("--------This is Array-------------");
  console.time("mapSpeed");
  var x = map(hashObject, oldJson);
  var y = map(hashObject, newJson);
  console.timeEnd("mapSpeed");
  // Use LCS
  var tmpPatches = [];
  lcs.LCS(x, y, unchanged, tmpPatches, path);
  for (var l = 0; l < tmpPatches.length; l++) {
    patches.push(tmpPatches[l]);
  }
  // console.log("--------Array complete-------");
}

function hashObject(obj) {
  //Default hash
  return JSON.stringify(obj);

  //String-hash
  // return hash(obj);
}

function generateObjectDiff(oldJson, newJson, unchanged, patches, path) {
  var oldKeys = Object.keys(oldJson);
  var newKeys = Object.keys(newJson);
  var removed = false;

  // console.log("oldKeys: " + oldKeys);
  // console.log("newKeys: " + newKeys);

  var oldKey, oldValue;
  // Loop from the old; from lengths -1 to 0
  for (var i = oldKeys.length -1; i >= 0; i--) {
    oldKey = oldKeys[i];
    oldValue = oldJson[oldKey];

    // console.log("oldKey: " + oldKey);
    // console.log("oldValue: " + JSON.stringify(oldValue));

    if (newJson.hasOwnProperty(oldKey)) {

      // go deeper
      generateDiff(oldJson[oldKey], newJson[oldKey], unchanged, patches, path + "/" + oldKey );
      // ???? patchPointString(oldKey)

    } else {
      // Remove
      // console.log({ op: "remove", path: path + "/" + patchPointString(oldKey), value: copy.clone(oldValue) });
      removed = true;
      console.time("Object-remove");
      patches.push(hashObject({ op: "remove", path: path + "/" + patchPointString(oldKey), value: oldValue }));
      console.timeEnd("Object-remove");
    }

  }

  // If doesn't remove and the length is the same, return
  // Return: only the length is equal and doesn't remove
  if (!removed && newKeys.length === oldKeys.length) { return; }

  // Loop from the new
  // length is not the same
  var newKey;
  var newVal;
  for (var j = 0; j < newKeys.length; j ++) {
    newKey = newKeys[j];
    newVal = newJson[newKey];
    if (!oldJson.hasOwnProperty(newKey)) {
      //Try to find the value in the unchanged area
      // change JSON.stringify()
      console.time("Object-find");
      var pointer = unchangedArea.findValueInUnchanged(JSON.stringify(newVal), unchanged);
      console.timeEnd("Object-find");
      // console.log("pointer: " + pointer);
      if (pointer) {
        //COPY
        // console.log({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer});
        patches.push(hashObject({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer}));
      } else {
        // no json.stringnify
        if (typeof newVal === "string") {
          // Ajust 333 => "333"
           newVal = "\"" + newVal + "\"";
        }
        console.time("patch-find");
        var previousIndex = patchArea.findValueInPatch(newVal, patches);
        console.timeEnd("patch-find");
        // console.log("previousIndex: " + previousIndex);

        if (previousIndex !== -1) {
          // MOVE
          var oldPath = JSON.parse(patches[previousIndex]).path;
          patches.splice(previousIndex, 1);
          // console.log({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)});
          patches.push(hashObject({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)}));
        } else {
          //ADD
          // console.log({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newVal)});
          patches.push(hashObject({ op: "add", path: path + "/" + patchPointString(newKey), value: newVal}));
        }

      }

    }
  }
}

function patchPointString(str) {
  // According to RFC 6901
  // '~' needs to be encoded as '~0'
  // '/' needs to be encoded as '~1'
  if (str.indexOf('/') === -1 && str.indexOf('~') === -1) {
    return str;
  }
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}



/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function map(f, a) {

  var b =  new Array(a.length);
  for (var i = 0; i < a.length; i++) {
    // b[i] = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    b[i] = f(a[i]);
  }
  return b;
}
