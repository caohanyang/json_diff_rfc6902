(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jdr = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var copy = require('./deepClone');
// var deepEqual = require('./deepEquals.js');
var applyPatches = require('./applyPatches');
var lcs = require('./LCS.js');
var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');

exports = module.exports.diff = diff;
exports = module.exports.apply = apply;

// browserify -s jdr -e JSON-Diff.js -o json-diff-rfc6902.js

function apply(app_old, jpn_patch) {
  applyPatches.apply(app_old, jpn_patch);
}

function diff(oldJson, newJson) {

  // Get the unchanged area
  var unchanged = [];
  unchangedArea.generateUnchanged(oldJson, newJson, unchanged, '');

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
    patches.push({ op: "replace", path: path, value: copy.clone(newJson)});
  }

}

function generateArrayDiff(oldJson, newJson, unchanged, patches, path) {
  // console.log("--------This is Array-------------");
  // Hash array
  var x = oldJson.map(hashArray);
  var y = newJson.map(hashArray);
  // Use LCS
  var tmpPatches = [];
  lcs.LCS(x, y, unchanged, tmpPatches, path);
  for (var l = 0; l < tmpPatches.length; l++) {
    patches.push(tmpPatches[l]);
  }
  // console.log("--------Array complete-------");
}

function hashArray(obj) {
  //Default hash
  return JSON.stringify(obj);
}
function generateObjectDiff(oldJson, newJson, unchanged, patches, path) {
  var oldKeys = Object.keys(oldJson);
  var newKeys = Object.keys(newJson);
  var removed = false;

  // console.log("oldKeys: " + oldKeys);
  // console.log("newKeys: " + newKeys);

  // Loop from the old; from lengths -1 to 0
  for (var i = oldKeys.length -1; i >= 0; i--) {
    var oldKey = oldKeys[i];
    var oldValue = oldJson[oldKey];

    // console.log("oldKey: " + oldKey);
    // console.log("oldValue: " + JSON.stringify(oldValue));

    if (newJson.hasOwnProperty(oldKey)) {
      var newValue = newJson[oldKey];

      // console.log("newValue: " + JSON.stringify(newValue));

      // go deeper
      generateDiff(oldJson[oldKey], newJson[oldKey], unchanged, patches, path + "/" + oldKey );
      // ???? patchPointString(oldKey)

    } else {
      // Remove
      // console.log({ op: "remove", path: path + "/" + patchPointString(oldKey), value: copy.clone(oldValue) });
      removed = true;
      patches.push({ op: "remove", path: path + "/" + patchPointString(oldKey), value: copy.clone(oldValue) });
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
      var pointer = unchangedArea.findValueInUnchanged(JSON.stringify(newVal), unchanged);
      // console.log("pointer: " + pointer);
      if (pointer) {
        //COPY
        // console.log({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer});
        patches.push({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer});
      } else {
        // no json.stringnify
        var previousIndex = patchArea.findValueInPatch(newVal, patches);
        // console.log("previousIndex: " + previousIndex);

        if (previousIndex !== -1) {
          // MOVE
          var oldPath = patches[previousIndex].path;
          patches.splice(previousIndex, 1);
          // console.log({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)});
          patches.push({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)});
        } else {
          //ADD
          // console.log({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newVal)});
          patches.push({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newVal)});
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

},{"./LCS.js":2,"./applyPatches":3,"./deepClone":4,"./patchArea.js":8,"./unchangedArea.js":9}],2:[function(require,module,exports){
// var dEqual = require('./deepEquals.js');
var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');

module.exports.LCS = LCS;

function LCS (x, y, unchanged, patches, path) {
  //get the trimed sequence
  var start = 0;
  var x_end = x.length - 1;
  var y_end = y.length - 1;
  //trim off the sequence in the beginning
  while (start <= x_end && start <= y_end && x[start] === y[start]) {
    start++;
  }

  //trim off the sequence in the end
  while (start <= x_end && start <= y_end && x[x_end] === y[y_end]) {
    x_end--;
    y_end--;
  }

  var newX = x.slice(start, x_end + 1);
  var newY = y.slice(start, y_end + 1);

  var matrix = lcsMatrix(newX, newY);

  //backtrack
  // var result = lcsResult(newX, newY, matrix);
  // var finalResult = x.slice(0, start) + result + x.slice(x_end + 1, x.length);
  // For Array
  // console.log("Result: " + finalResult);

  // Set offset = 1, offset is the array index adjuster for JSON format patch
  var offset = {};
  offset.value = 1;
  // pass offset reference
  printDiff(newX, newY, matrix, newX.length - 1, newY.length -1, start, offset, unchanged, patches, path);

}

function lcsMatrix(x, y) {
  var x_length = x.length;
  var y_length = y.length;
  // Create a two dimention array
  var matrix = new Array(x_length + 1);
  for (var l = 0; l <= x_length; l++) {
    matrix[l] = new Array(y_length + 1);
  }

  // fill the first column
  for (var m = 0; m <= x_length; m++) {
    matrix[m][0] = 0;
  }
  // fill the first row
  for (var n = 0; n <= y_length; n++) {
    matrix[0][n] = 0;
  }

  // LCS
  for (var i = 0; i < x_length; i++) {
    for(var j = 0; j < y_length; j++) {
      if (x[i] === y[j]){
        matrix[i+1][j+1] = matrix[i][j] + 1;
      } else {
        matrix[i+1][j+1] = Math.max(matrix[i+1][j], matrix[i][j+1]);
      }

    }
  }

  // console.log("LCSLength = " + matrix[x_length][y_length]);
  return matrix;
}

function lcsResult(x, y, matrix) {
  return backtrack(x, y, matrix, x.length - 1, y.length - 1);
}

function backtrack(x, y, matrix, i, j) {

  if (i === -1 || j === -1) {
    return "";
  } else if (x[i] === y[j]) {
    return backtrack(x, y, matrix, i-1, j-1) + x[i];
  } else {

    if (matrix[i+1][j] >= matrix[i][j+1]) {
      return backtrack(x, y, matrix, i, j-1);
    } else {
      return backtrack(x, y, matrix, i-1, j);
    }

  }
}

function printDiff(x, y, matrix, i, j, start, offset, unchanged, patches, path) {
  if (i > -1 && j > -1 && x[i] === y[j]) {

    printDiff(x, y, matrix, i-1, j-1, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log(" " + x[i]+ " i=" +i);

  } else if (j > -1 && (i === -1 || matrix[i+1][j] >= matrix[i][j+1])) {

    printDiff(x, y, matrix, i, j-1, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log("i =  " + i);

    // First Add or Replace
    var lastElement = patches[patches.length - 1];
    var tmpPath = path + "/" + (i + start + offset.value);
    if (lastElement !== void 0 && lastElement.op === "remove" && lastElement.path === tmpPath) {
      //First Replace
      // console.log({  op: "replace", path: tmpPath, value: y[j] });
      patches[patches.length - 1].op = "replace";
      patches[patches.length - 1].value = JSON.parse(y[j]);
    } else {

      // First MOVE or ADD or COPY
      var previousIndex = patchArea.findValueInPatch(y[j], patches);
      // console.log("previousIndex: " + previousIndex);
      // ********Need to be fiexed*****************
      // only move when the previousIndex is 0 and patchLength is 1
      // if (previousIndex !== -1) {
      if (previousIndex === 0 && patches.length === 1) {
        // MOVE
        var oldPath = patches[previousIndex].path;
        // console.log({  op: "move", from: oldPath, path: tmpPath});
        patches.splice(previousIndex, 1);
        patches.push({ op: "move", from: oldPath, path: tmpPath});
      } else {
        // ADD OR COPY
        //Try to find the value in the unchanged area
        // var pointer = findValueInUnchanged(JSON.stringify(y[j]), unchanged);
        var pointer = unchangedArea.findValueInUnchanged(y[j], unchanged);
        // console.log("pointer: " + pointer);
        if (pointer) {
          // COPY
          // Adjust the index in the unchanged area
          var newPointerArr = pointer.split('/');
          var initIndex = parseInt(newPointerArr[newPointerArr.length - 1]);
          // console.log("offset: " + offset.value);
          // console.log("start: " + start);
          // console.log("initIndex: " + initIndex);

          var newIndex;
          // change index
          if (initIndex < start) {
            newIndex = initIndex;
          } else {
            newIndex = initIndex + offset.value - 1;
          }
          // console.log("newIndex: " + newIndex);
          if (newIndex >= 0) {
            // newIndex >= 0, hence the element exists in the array, copy
            var index = pointer.lastIndexOf('/');
            if (index !== -1) {
              var newPointer = pointer.slice(0, index + 1) + newIndex;
              // console.log({  op: "copy", path: tmpPath, from: newPointer });
              patches.push({ op: "copy", path: tmpPath, from: newPointer });
            }
          } else {
            // newIndex < 0, hence the element doesn't exist in the array, add
            // console.log({  op: "add", path: tmpPath, value: y[j] });
            patches.push({ op: "add", path: tmpPath, value: JSON.parse(y[j]) });
          }
        } else {
          // ADD
          // console.log({  op: "add", path: tmpPath, value: y[j] });
          patches.push({ op: "add", path: tmpPath, value: JSON.parse(y[j]) });
        }
      }
    }
    //Then change offset
    offset.value++;

  } else if (i > -1 && (j === -1 || matrix[i+1][j] < matrix[i][j+1])) {

    printDiff(x, y, matrix, i-1, j, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log("i =  " + i);
    //First change offset
    offset.value--;
    //Then remove
    // console.log({  op: "remove", path: path + "/" + (i + start + offset.value), value: x[i] });
    patches.push({ op: "remove", path: path + "/" + (i + start + offset.value), value: JSON.parse(x[i]) });
  } else {
    // console.log("reach the end i = " + i);
  }
}

},{"./patchArea.js":8,"./unchangedArea.js":9}],3:[function(require,module,exports){
var fs = require('fs');

module.exports.apply = apply;

var objectOps = {
  add: function(child_json, key, all_json) {
    // console.log(this);
    // console.log(child_json);
    child_json[key] = this.value;
    // console.log("Add operation = " + this.value);
    return true;
  },
  remove: function(child_json, key, all_json) {
    delete child_json[key];
    // console.log("Remove operation = " + child_json);
    return true;
  },
  replace: function(child_json, key, all_json) {
   child_json[key] = this.value;
  //  console.log("replace operation = " + this.value);
   return true;
  },
  copy: function(child_json, key, all_json) {
    // console.log("copy operation = " + JSON.stringify(child_json));
    // console.log("key = " + key);
    var tmpOp = {"op": "val_get", "path": this.from};
    //Get the tmp value
    apply(all_json, [tmpOp]);
    apply(all_json, [{
      "op": "add", "path": this.path, "value": tmpOp.value
    }]);
    return true;
  },
  move: function(child_json, key, all_json) {
    // console.log("move operation = " + JSON.stringify(child_json));
    var tmpOp = {"op": "val_get", "path": this.from};
    //Get the tmp value
    apply(all_json, [tmpOp]);
    apply(all_json, [{"op": "remove", "path": this.from}]);
    apply(all_json, [{"op": "add", "path": this.path, "value": tmpOp.value}]);
  },
  val_get: function(child_json, key) {
    this.value = child_json[key];
  }
};

var arrayOps = {
  add: function(arr, key, all_json) {
    arr.splice(key, 0, this.value);
    // console.log("Add operation = " + this.value);
    return true;
  },
  remove: function(arr, key, all_json) {
    arr.splice(key, 1);
    // console.log("Remove operation = " + key);
    return true;
  },
  replace: function(arr, key, all_json) {
    arr[key] = this.value;
    return true;
  },
  copy: objectOps.copy,
  move: objectOps.move,
  val_get: objectOps.val_get
};

var rootOps = {
  remove: function(root_json) {
    for (var element in root_json) {
      // this here is the patch
      objectOps.remove.call(this, root_json, element);
    }
    return true;
  },
  add: function(root_json) {
    rootOps.remove.call(this, root_json);
    for (var element in this.value) {
      root_json[element] = this.value[element];
    }
    return true;
  },
  replace: function(root_json) {
    apply(root_json, [{"op": "remove", "path": this.path}]);
    apply(root_json, [{"op": "add", "path": this.path, "value": this.value}]);
    return true;
  },
  copy: objectOps.copy,
  move: objectOps.move,
  val_get: function(child_json) {
    this.value = child_json;
  }
};

function apply(all_json, patches) {
   for (var i = 0; i < patches.length; i++) {
     var patch = patches[i];
     if (patch !== void 0) {
      //when patch = "", it's the root
      var path = patch.path || "";
      // console.log(path);
      var keys = path.split("/");
      var child_json = all_json;

      //first element is undefined
      var key;
      //child_json is the second end element
      for (var j = 1; j < keys.length - 1; j++) {
         key = keys[j];
         child_json = child_json[key];
      }
      //key is the last element's path
      key = keys[keys.length -1];

      //This is the root operations
      if (key === "") {
        // console.log("The key is undefined");
        rootOps[patch.op].call(patch, child_json, stringToPoint(key), all_json);
        break;
      }

      if (Array.isArray(child_json)) {
        // console.log("***********Array operations****************");
        if (key === '-') {
          key = child_json.length;
        } else {
          key = parseInt(key);
        }
        arrayOps[patch.op].call(patch, child_json, key, all_json);
      } else {
        // console.log("***********Object operations***************");
        objectOps[patch.op].call(patch, child_json, stringToPoint(key), all_json);
      }
     }
   }
}

function stringToPoint(str) {
  // According to RFC 6901
  // '~' needs to be encoded as '~0'
  // '/' needs to be encoded as '~1'
  if(str && str.indexOf('~') !== -1) {
    return str.replace(/~0/g, '~').replace(/~1/g, '/');
  }
  return str;
}

},{"fs":10}],4:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * Create a deep copy of x which must be a legal JSON object/array/value
 * @param {object|array|string|number|null} x object/array/value to clone
 * @returns {object|array|string|number|null} clone of x
 */

function clone(x) {
  if (x === null | x !== "object")
  {return x;}
  // array is object
  if (Array.isArray(x))
  {return copyArray(x);}

  if (typeof x === "object")
  {return copyObject(x);}
}

function copyArray(x) {

  var arr = [];
  for (var i = 0; i < x.length; x++) {
    arr[i] = x[i];
  }
  return arr;
}

function copyObject(x) {
  var objectKeys = Object.keys(x);
  var obj = {};
  for (var k, i = 0; i < objectKeys.length; i++) {
    k = objectKeys[i];
    obj[k] = x[k];
  }

  return obj;
}

module.exports.clone = clone;

},{}],5:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}

},{"./lib/is_arguments.js":6,"./lib/keys.js":7}],6:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],7:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],8:[function(require,module,exports){
var equal = require('deep-equal');

module.exports.findValueInPatch = findValueInPatch;
module.exports.handlePatch = handlePatch;

function findValueInPatch(newValue, patches) {

  var patchValue;
  for (var i = 0; i < patches.length; i++) {
    patchValue = patches[i].value;
    if (equal(newValue, typeof patchValue === "string"? patchValue: JSON.stringify(patchValue)) && patches[i].op === 'remove') {
      return i;
    }
  }

  return -1;
}

function handlePatch(patches) {
  // Delete the value in 'remove' option
  for (var i = 0; i < patches.length; i++) {
    if (patches[i].op === 'remove') {
      delete patches[i].value;
    }
  }
}

},{"deep-equal":5}],9:[function(require,module,exports){
var equal = require('deep-equal');
exports = module.exports.generateUnchanged = generateUnchanged;
exports = module.exports.findValueInUnchanged = findValueInUnchanged;


function generateUnchanged(oldJson, newJson, unchanged, path) {
  // Check if two json is the same
  // Equal
  if (equal(oldJson, newJson)) {
    // console.log({path: path, value: copy.clone(newJson)});
    unchanged.push( path + "=" + JSON.stringify(newJson));
    return;
  }

  // Not equal
  // Check the type
  if (typeof oldJson !== typeof newJson) { return; }

  // Type is the same
  if (Array.isArray(oldJson) && Array.isArray(newJson)) {
    // Array
    generateUnchangedArray(oldJson, newJson, unchanged, path);
    return;
  }

  if (typeof oldJson === "object" && oldJson !== null && typeof newJson === "object"  && newJson !== null) {
    // Object
    generateUnchangedObject(oldJson, newJson, unchanged, path);
    return;
  }
}

//********************Need to be changed ********************
function generateUnchangedArray(oldJson, newJson, unchanged, path) {
  var miniLength = Math.min(oldJson.length, newJson.length);
  // console.log("miniLength is " + miniLength);
  for (var i = 0; i < miniLength; i++) {
    generateUnchanged(oldJson[i], newJson[i], unchanged, path + "/" + i);
  }
}

function generateUnchangedObject(oldJson, newJson, unchanged, path) {
  var oldKeys = Object.keys(oldJson);
  var newKeys = Object.keys(newJson);

  for (var i = 0; i < oldKeys.length; i++) {
    var oldKey = oldKeys[i];
    if (newJson.hasOwnProperty(oldKey)) {
      generateUnchanged(oldJson[oldKey], newJson[oldKey], unchanged, path + "/" + oldKey);
    }
  }
}

function findValueInUnchanged(newValue, unchanged) {
  for (var i = 0; i < unchanged.length; i++) {
    var value = unchanged[i].split("=")[1];
    // console.log("Value = " +  value);
    // console.log("ValueType = " +  Array.isArray(value));
    // console.log("newValue = " +  newValue);
    // console.log("newValueType = " +  typeof newValue);
    if (equal(newValue, value)) {
      return unchanged[i].split("=")[0];
    }
  }
}

},{"deep-equal":5}],10:[function(require,module,exports){

},{}]},{},[1])(1)
});