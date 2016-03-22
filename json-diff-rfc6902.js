(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jdr = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var applyPatches = require('./applyPatches');
var lcs = require('./LCS.js');
var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');
var hashObject = require('./hashObject.js');
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
    patches.push(hashObject.hash({ op: "replace", path: path, value: newJson}));
  }

}

function generateArrayDiff(oldJson, newJson, unchanged, patches, path) {
  // console.log("--------This is Array-------------");
  var x = hashObject.map(hashObject.hash, oldJson);
  var y = hashObject.map(hashObject.hash, newJson);
  // Use LCS
  var tmpPatches = [];
  lcs.LCS(x, y, unchanged, tmpPatches, path);
  for (var l = 0; l < tmpPatches.length; l++) {
    patches.push(tmpPatches[l]);
  }
  // console.log("--------Array complete-------");
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
      patches.push(hashObject.hash({ op: "remove", path: path + "/" + patchPointString(oldKey), value: oldValue }));
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
        patches.push(hashObject.hash({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer}));
      } else {
        // no json.stringnify
        if (typeof newVal === "string") {
          // Ajust 333 => "333"
           newVal = "\"" + newVal + "\"";
        }
        var previousIndex = patchArea.findValueInPatch(newVal, patches);
        // console.log("previousIndex: " + previousIndex);

        if (previousIndex !== -1) {
          // MOVE
          var oldPath = JSON.parse(patches[previousIndex]).path;
          patches.splice(previousIndex, 1);
          // console.log({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)});
          patches.push(hashObject.hash({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)}));
        } else {
          //ADD
          // console.log({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newVal)});
          patches.push(hashObject.hash({ op: "add", path: path + "/" + patchPointString(newKey), value: newVal}));
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

},{"./LCS.js":2,"./applyPatches":3,"./hashObject.js":5,"./patchArea.js":6,"./unchangedArea.js":7}],2:[function(require,module,exports){
var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');
var hashObject = require('./hashObject.js');

exports.LCS = LCS;

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

  } else if (j > -1 && (i === -1 || matrix[i+1][j] >= matrix[i][j+1])) {

    printDiff(x, y, matrix, i, j-1, start, offset, unchanged, patches, path);

    // First Add or Replace
    var lastElement = patches[patches.length - 1];
    var tmpPath = path + "/" + (i + start + offset.value);

    if (lastElement !== void 0) {
      lastElement = JSON.parse(lastElement);
      if (lastElement !== void 0 && lastElement.op === "remove" && lastElement.path === tmpPath) {
        //First Replace
        lastElement.op = "replace";
        lastElement.value = JSON.parse(y[j]);
        patches.splice(patches.length - 1, 1, JSON.stringify(lastElement));

      } else {
        addCopyMove(x, y, matrix, i, j, start, offset, unchanged, patches, path, tmpPath);
      }
    } else {
      addCopyMove(x, y, matrix, i, j, start, offset, unchanged, patches, path, tmpPath);
    }
    //Then change offset
    offset.value++;

  } else if (i > -1 && (j === -1 || matrix[i+1][j] < matrix[i][j+1])) {

    printDiff(x, y, matrix, i-1, j, start, offset, unchanged, patches, path);
    //First change offset
    offset.value--;
    //Then remove
    // console.log({  op: "remove", path: path + "/" + (i + start + offset.value), value: x[i] });
    patches.push(hashObject.hash({ op: "remove", path: path + "/" + (i + start + offset.value), value: JSON.parse(x[i]) }));
    // patches.push({ op: "remove", path: path + "/" + (i + start + offset.value), value: oldJson[i] });
  } else {
    // console.log("reach the end i = " + i);
  }
}

function addCopyMove(x, y, matrix, i, j, start, offset, unchanged, patches, path, tmpPath) {
  // First MOVE or ADD or COPY
  // var templeOps = hashObject({ op: "remove", path: tmpPath, value: JSON.parse(y[j])});
  var previousIndex = patchArea.findValueInPatch(y[j], patches);
  // var previousIndex = -1;  //save 4ms
  // //
  // ********Need to be fiexed*****************
  // only move when the previousIndex is 0 and patchLength is 1
  // if (previousIndex !== -1)
  if (previousIndex === 0 && patches.length === 1) {
    // MOVE
    var oldPath = JSON.parse(patches[previousIndex]).path;
    // console.log({  op: "move", from: oldPath, path: tmpPath});
    patches.splice(previousIndex, 1);
    patches.push(hashObject.hash({ op: "move", from: oldPath, path: tmpPath}));
  } else {
    // ADD OR COPY
    //Try to find the value in the unchanged area
    var pointer = unchangedArea.findValueInUnchanged(y[j], unchanged);
    // var pointer = null;  // save 5ms
    if (pointer) {
      // COPY
      // Adjust the index in the unchanged area
      var newPointerArr = pointer.split('/');
      var initIndex = parseInt(newPointerArr[newPointerArr.length - 1]);

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
          patches.push(hashObject.hash({ op: "copy", path: tmpPath, from: newPointer }));
        }
      } else {
        // newIndex < 0, hence the element doesn't exist in the array, add
        patches.push(hashObject.hash({ op: "add", path: tmpPath, value: JSON.parse(y[j]) }));
        // patches.push({ op: "add", path: tmpPath, value: newJson[j] });
      }
    } else {
      // ADD
      patches.push(hashObject.hash({ op: "add", path: tmpPath, value: JSON.parse(y[j]) }));
      // patches.push({ op: "add", path: tmpPath, value:  newJson[j] });

    }
  }
}

},{"./hashObject.js":5,"./patchArea.js":6,"./unchangedArea.js":7}],3:[function(require,module,exports){
exports.apply = apply;

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

},{}],4:[function(require,module,exports){
module.exports._equals = _equals;

/**
 * Compare 2 JSON values, or recursively compare 2 JSON objects or arrays
 * @param {object|array|string|number|boolean|null} a
 * @param {object|array|string|number|boolean|null} b
 * @returns {boolean} true iff a and b are recursively equal
 */
 var _objectKeys = (function () {
     if (Object.keys)
         {return Object.keys;}

     return function (o) {
         var keys = [];
         for (var i in o) {
             if (o.hasOwnProperty(i)) {
                 keys.push(i);
             }
         }
         return keys;
     };
 })();

 var _isArray;
 if (Array.isArray) {
     _isArray = Array.isArray;
 } else {
     _isArray = function (obj) {
         return obj.push && typeof obj.length === 'number';
     };
 }

 /**
  * _equals - This can save a lot of time 5 ms
  *
  * @param  {type} a description
  * @param  {type} b description
  * @return {type}   description
  */
 function _equals(a, b) {
     switch (typeof a) {
         case 'undefined':
         case 'boolean':
         case 'string':
         case 'number':
             return a === b;
         case 'object':
             if (a === null)
                 {return b === null;}
             if (_isArray(a)) {
                 if (!_isArray(b) || a.length !== b.length)
                     {return false;}

                 for (var i = 0, l = a.length; i < l; i++) {
                   if (!_equals(a[i], b[i]))
                   {return false;}
                 }

                 return true;
             }

             var bKeys = _objectKeys(b);
             var bLength = bKeys.length;
             if (_objectKeys(a).length !== bLength)
                 {return false;}

             for (var i = 0, k; i < bLength; i++) {
               k = bKeys[i];
               if (!(k in a && _equals(a[k], b[k])))
               {return false;}
             }

             return true;

         default:
             return false;
     }
 }

},{}],5:[function(require,module,exports){

exports.hash = hash;
exports.map = map;

function hash(obj) {
  //Default hash
  return JSON.stringify(obj);

  //String-hash
  // return hash(obj);
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

},{}],6:[function(require,module,exports){
var deepEqual = require('./deepEquals.js');
exports.findValueInPatch = findValueInPatch;
exports.handlePatch = handlePatch;

function findValueInPatch(newValue, patches) {

  var patchValue;
  // for (var i = 0; i < patches.length; i++) {
  //   patchValue = patches[i].value;
  //   if (deepEqual._equals(newValue, typeof patchValue === "string"? patchValue: JSON.stringify(patchValue)) && patches[i].op === 'remove') {
  //     return i;
  //   }
  // }

  for (var i = 0; i < patches.length; i++) {
    patchValue = patches[i];
    patchValue = patchValue.substring(patchValue.indexOf('value') + 7, patchValue.length - 1);

    if (patchValue.length !== newValue.length) {
      // Speed up ?????
      continue;
    }

    if (deepEqual._equals(newValue, patchValue)) {
      return i;
    }
  }

  return -1;
}

function handlePatch(patches) {
  // Delete the value in 'remove' option
  for (var i = 0; i < patches.length; i++) {
    patches[i] = JSON.parse(patches[i]);
    if (patches[i].op === 'remove') {
      delete patches[i].value;
    }
  }
}

},{"./deepEquals.js":4}],7:[function(require,module,exports){
var deepEqual = require('./deepEquals.js');
var hashObject = require('./hashObject.js');

exports.generateUnchanged = generateUnchanged;
exports.findValueInUnchanged = findValueInUnchanged;


function generateUnchanged(oldJson, newJson, unchanged, path) {
  // Check if two json is the same
  // Equal
  if (deepEqual._equals(oldJson, newJson)) {
  // if (equal(oldJson, newJson)) {
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

function arrayCompare(oldArr, newArr, unchanged, path) {
  // Check if two array element (string) is the same
  // Equal
  if (oldArr === newArr) {
  // if (equal(oldJson, newJson)) {
    // console.log({path: path, value: copy.clone(newJson)});
    unchanged.push( path + "=" + newArr);
    return;
  }

}

//********************Need to be changed ********************
function generateUnchangedArray(oldJson, newJson, unchanged, path) {
  //When is the Array, stop to find leaf node
  var x = hashObject.map(hashObject.hash, oldJson);
  var y = hashObject.map(hashObject.hash, newJson);

  var miniLength = Math.min(x.length, y.length);
  // console.log("miniLength is " + miniLength);
  for (var i = 0; i < miniLength; i++) {
    // generateUnchanged(x[i], y[i], unchanged, path + "/" + i);
    arrayCompare(x[i], y[i], unchanged, path + "/" + i);
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
    if (value.length !== newValue.length) {
      // Speed up ?????
      continue;
    }

    if (deepEqual._equals(newValue, value)) {
      return unchanged[i].split("=")[0];
    }
  }
}

},{"./deepEquals.js":4,"./hashObject.js":5}]},{},[1])(1)
});