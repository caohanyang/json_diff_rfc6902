(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jdr = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var applyPatches = require('./lib/applyPatches');
var unchangedArea = require('./lib/unchangedArea.js');
var patchArea = require('./lib/patchArea.js');
var hashObject = require('./lib/hashObject.js');
var fjp = require('fast-json-patch');

exports.diff = diff;
exports.apply = apply;

// browserify -s jdr -e JSON-Diff.js -o json-diff-rfc6902.js
var OBJ_COM = true;
var ARR_COM = true;

function apply(app_old, jpn_patch) {
  applyPatches.apply(app_old, jpn_patch);
}

function diff(oldJson, newJson, options) {
  // Initial
  if(typeof options === 'object') {
    if(options.OBJ_COM !== void 0) {OBJ_COM = options.OBJ_COM;}
    if(options.ARR_COM !== void 0) {ARR_COM = options.ARR_COM;}
  }
  // Get the unchanged area
  var unchanged = [];
  if (OBJ_COM === true) {
    unchangedArea.generateUnchanged(oldJson, newJson, unchanged, '');
  }

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
    patches.push({ op: "replace", path: path, value: newJson});
  }

}

function generateArrayDiff(oldJson, newJson, unchanged, patches, path) {
  // console.log("--------This is Array-------------");
  // x, y is the hash of json
  // var x = hashObject.map(hashObject.hash, oldJson);
  // var y = hashObject.map(hashObject.hash, newJson);
  // Use LCS
  var tmpPatches = [];
  var tmpPatchHashes = [];

  if (oldJson.length === 0) {
    patches.push({ op: "add", path: path, value: newJson});
  } else {
    // Use sortBack
    tmpPatches = transformArray(oldJson, newJson, unchanged, tmpPatches, tmpPatchHashes, path);
    for (var l = 0; l < tmpPatches.length; l++) {
      patches.push(tmpPatches[l]);
    }
  }

}

function generateObjectDiff(oldJson, newJson, unchanged, patches, path) {
  var oldKeys = Object.keys(oldJson);
  var newKeys = Object.keys(newJson);
  var removed = false;

  var oldKey, oldValue;
  // Loop from the old; from lengths -1 to 0
  for (var i = oldKeys.length -1; i >= 0; i--) {
    oldKey = oldKeys[i];
    oldValue = oldJson[oldKey];

    if (newJson.hasOwnProperty(oldKey)) {

      // go deeper
      generateDiff(oldJson[oldKey], newJson[oldKey], unchanged, patches, path + "/" + oldKey);

    } else {
      // Remove
      removed = true;
      patches.push({ op: "remove", path: path + "/" + patchPointString(oldKey), value: oldValue });
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
      if (pointer) {
        //COPY
        patches.push({ op: "copy", path: path + "/" + patchPointString(newKey), from: pointer});
      } else {
        // no json.stringnify
        var previousIndex = -1;
        if (OBJ_COM === true) {
          previousIndex = patchArea.findValueInPatch(newVal, patches);
        }

        if (previousIndex !== -1 && patches[previousIndex].op === 'remove') {
          // MOVE
          var oldPath = patches[previousIndex].path;
          patches.splice(previousIndex, 1);
          patches.push({ op: "move", from: oldPath, path: path + "/" + patchPointString(newKey)});
        } else {
          //ADD
          patches.push({ op: "add", path: path + "/" + patchPointString(newKey), value: newVal});
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


function transformIndex(element, m, array) {
  var finalIndex;

   switch(element.op) {
     case 'add':
     case 'replace':
     case 'copy':
          // When add, replace and copy, add directly
          return element.index;
     case 'remove':
          finalIndex = element.index;
          break;
     case 'move':
          finalIndex = element.from;
          break;
   }

   for (var i = 0; i < m; i++) {
      switch (array[i].op) {
        case 'remove':
           if(finalIndex > array[i].index) {
             // when equal, don't --
             finalIndex --;
           }
          break;
        case 'add':
        case 'copy':
          if(finalIndex >= array[i].index) {
            // when equal, do ++
            finalIndex ++;
          }
          break;
        case 'replace':
          // when equal, don't change
          break;

        case 'move':
          if (array[i].from !== array[i].index) {
            var min = Math.min(array[i].from, array[i].index);
            var max = Math.max(array[i].from, array[i].index);

            if (finalIndex >= min && finalIndex <= max) {
              if (array[i].from > array[i].index) {
                finalIndex ++;
              } else {
                finalIndex --;
              }
            }
          }
          break;
      }
   }

  return finalIndex;

}

function operationValue (op) {
  switch (op) {
    case "move"   : return 0;
    case "remove" : return 1;
    case "add"    : return 2;
    case "replace": return 3;
    case "copy"   : return 4;
  }
}

function compare(a, b) {
  if (a.index === b.index) {
    // Order: move < remove < add
    var a_value = operationValue(a.op);
    var b_value = operationValue(b.op);

    if (a_value > b_value) {
      return 1;
    } else {
      return -1;
    }
  } else {
    return a.index - b.index;
  }
}

function findCopyInArray(element, m, array, arrUnchanged) {
  var copyIndex = -1;

  for (var i = 0; i < m; i++) {
    switch (element.op) {
      case 'remove':
      case 'copy':
                   break;
      default:
        // Move Replace Add
        if (element.hash === array[i].hash) {
          return array[i].index;
        }
        break;
    }
  }

  //Find value in arrUnchanged
  for (var j= 0; j< arrUnchanged.length; j++) {
    if (element.hash === arrUnchanged[j].hash) {
      return arrUnchanged[j].index;
    }
  }

  return copyIndex;
}

function transformArray(oldJson, newJson, unchanged, patches, patchHashes, path, jsondiff) {
  //When is the Array, stop to find leaf node
  // (hash, value, index)
  var x = hashObject.mapArray(hashObject.hash, oldJson);
  var y = hashObject.mapArray(hashObject.hash, newJson);

  // Reserve the origin index
  // COPY ARRAY
  var x_sorted = x.slice();
  var y_sorted = y.slice();

  x_sorted.sort(function(a, b) {return a.hash - b.hash;});
  y_sorted.sort(function(a, b) {return a.hash - b.hash;});


  //Diff
  var arrPatch = [], arrUnchanged = [], arrtmp = [];
  var i= 0, j = 0;

  while (i < x_sorted.length) {
    while( j < y_sorted.length) {
      if(x_sorted[i] !== void 0) {

        if (x_sorted[i].hash > y_sorted[j].hash) {
          arrPatch.push({op: "add", value: y_sorted[j].value, index: y_sorted[j].index, hash: y_sorted[j].hash });
          j++;

        } else if (x_sorted[i].hash === y_sorted[j].hash) {
          // Unchanged push
          unchanged.push( path + '/' + y_sorted[j].index + "=" + JSON.stringify(x_sorted[i].hash));
          arrPatch.push({op: "move", value: y_sorted[j].value, from: x_sorted[i].index , index: y_sorted[j].index, hash: y_sorted[j].hash });
          i++;
          j++;

        } else {
          arrPatch.push({op: "remove",  index: x_sorted[i].index, value: x_sorted[i].value});
          i++;
        }

      } else {
        arrPatch.push({op: "add", value: y_sorted[j].value, index: y_sorted[j].index, hash: y_sorted[j].hash });
        j++;
      }

    }

    if (i < x_sorted.length) {
      // Remove the rest elements of the x_sorted
      arrPatch.push({op: "remove",  index: x_sorted[i].index, value: x_sorted[i].value });
      i++;
    }
  }

  //Get the patch to make all the elements are the same, but index is random
  arrPatch = arrPatch.sort(compare);

  // console.log(arrPatch);

  var m = 0;
  while(arrPatch[m] !== void 0) {
    // f_index = transformIndex(arrPatch[m], arrPatch);
    switch(arrPatch[m].op) {
      case 'add':
           arrPatch[m].index = transformIndex(arrPatch[m], m, arrPatch);
           // replace
           if (arrPatch[m-1] !== void 0 ) {
             if (arrPatch[m-1].op === 'remove' && arrPatch[m-1].index === arrPatch[m].index) {
              //  if replace a object, go deeper
              //  Set thresholds length == 30
              // if (JSON.stringify(arrPatch[m-1].value).length > 20 && typeof arrPatch[m-1].value === "object" && arrPatch[m-1].value !== null && typeof arrPatch[m].value === "object"  && arrPatch[m].value !== null) {
              if (typeof arrPatch[m-1].value === "object" && arrPatch[m-1].value !== null && typeof arrPatch[m].value === "object"  && arrPatch[m].value !== null) {

                 if (ARR_COM === true) {
                   var tmPatch = [];
                  //1.
                   generateDiff(arrPatch[m-1].value, arrPatch[m].value, unchanged, tmPatch, path + "/" + arrPatch[m-1].index);
                  //2.
                  //  tmPatch = fjp.compare(arrPatch[m-1].value, arrPatch[m].value);
                   //Need to be fixed.
                   arrPatch[m].op = 'replace';
                   arrPatch.splice(m-1,1);

                   arrtmp.pop();
                   arrtmp = arrtmp.concat(tmPatch);
                   continue;
                 } else {
                   arrPatch[m].op = 'replace';
                   arrPatch.splice(m-1,1);

                   arrtmp.pop();
                   arrtmp.push({op: "replace", value: arrPatch[m-1].value, path: path + '/' + arrPatch[m-1].index});
                   continue;
                 }

               } else {
                 arrPatch[m].op = 'replace';
                 arrPatch.splice(m-1,1);

                 arrtmp.pop();
                 arrtmp.push({op: "replace", value: arrPatch[m-1].value, path: path + '/' + arrPatch[m-1].index});
                 continue;
               }
             }
           }
           // COPY
           var copyIndex = findCopyInArray(arrPatch[m], m, arrPatch, arrUnchanged);
           if (copyIndex !== -1) {
             arrPatch[m].op = 'copy';
             arrPatch[m].from = copyIndex;
             if (arrPatch[m].index === arrPatch[m].from) {
               arrPatch.splice(m, 1);
               continue;
             }

             arrtmp.push({op: "copy", from: path + '/' + arrPatch[m].from, path: path + '/' + arrPatch[m].index});
           } else {
             arrtmp.push({op: "add", value: arrPatch[m].value , path: path + '/' + arrPatch[m].index});
           }
           break;
      case 'remove':
           arrPatch[m].index = transformIndex(arrPatch[m], m, arrPatch);
           if (arrPatch[m-1] !== void 0) {
             // change move 2->1 and remove 2 to remove 1
             if (arrPatch[m-1].op === 'move' && arrPatch[m-1].from === arrPatch[m].index && arrPatch[m-1].from === (arrPatch[m-1].index + 1) ) {
               arrPatch[m].index = arrPatch[m-1].index;
               arrPatch.splice(m-1,1);

               arrtmp.pop();
               arrtmp.push({op: "remove",  path: path + '/' + arrPatch[m-1].index});
               continue;

             } else {

               arrtmp.push({op: "remove",  path: path + '/' + arrPatch[m].index});
             }
           } else {

             arrtmp.push({op: "remove",  path: path + '/' + arrPatch[m].index});
           }
           break;
      case 'move':
           arrPatch[m].from = transformIndex(arrPatch[m], m, arrPatch);
           if (arrPatch[m].index === arrPatch[m].from) {
             arrUnchanged.push(arrPatch[m]);
             arrPatch.splice(m, 1);
             continue;
           }

           arrtmp.push({op: "move", from: path + '/' + arrPatch[m].from, path: path + '/' + arrPatch[m].index});

           break;
    }

    m++;

  }

  // console.log(arrtmp);
  // console.log("==========================");
  // console.log(arrPatch);
  //
  // console.log("========Final===============");
  arrPatch = arrPatch.map(function(obj) {
    obj.path = path + '/' + obj.index;
    delete obj.hash;
    delete obj.index;
    if (obj.op === 'move' || obj.op === 'copy') {
      obj.from = path + '/' + obj.from;
      delete obj.value;
    }

    return obj;
  });
  // console.log(arrPatch);

  return arrtmp;

}

},{"./lib/applyPatches":2,"./lib/hashObject.js":4,"./lib/patchArea.js":5,"./lib/unchangedArea.js":6,"fast-json-patch":7}],2:[function(require,module,exports){
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
    return true;
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
      // Attention: "" is not undefined
      if (key === undefined) {
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
var hashToNum = require('string-hash');

exports.hash = hash;
exports.map = map;
exports.mapArray = mapArray;

function hash(obj) {
  //Default hash
  // return JSON.stringify(obj);

  //String-hash
  return hashToNum(obj);
}

/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function map(f, a) {

  var b =  new Array({});
  for (var i = 0; i < a.length; i++) {
    b[i] = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    // JSON.stringnify
    // b[i] = f(a[i]);
  }
  return b;
}

/**
 * map the array. Faster than Array.prototype.map
 *
 * @param  {function} f function
 * @param  {Array} a array-like
 * @return {Array}   new Array mapped by f
 */
function mapArray(f, a) {

  var b =  [];
  for (var i = 0; i < a.length; i++) {
    b[i] = {};
    b[i].hash = f(typeof a[i] === "string"? a[i]: JSON.stringify(a[i]));
    b[i].index = i;
    b[i].value = a[i];
  }
  return b;
}

},{"string-hash":8}],5:[function(require,module,exports){
exports.findValueInPatchHashes = findValueInPatchHashes;
exports.findValueInPatch = findValueInPatch;
exports.handlePatch = handlePatch;

function findValueInPatchHashes(newValue, patchHashes) {

  var patchValue;

  for (var i = 0; i < patchHashes.length; i++) {
    patchValue = patchHashes[i].value;

    if (newValue === patchValue) {
      return i;
    }
  }

  return -1;
}

function findValueInPatch(newValue, patches) {

  var patchValue;

  for (var i = 0; i < patches.length; i++) {
    patchValue = patches[i].value;

    if (newValue === patchValue) {
      return i;
    }
  }

  return -1;
}

function handlePatch(patches) {
  // Delete the value in 'remove' option
  for (var i = 0; i < patches.length; i++) {
    // patches[i] = JSON.parse(patches[i]);
    if (patches[i].op === 'remove') {
      delete patches[i].value;
    }
  }
}

},{}],6:[function(require,module,exports){
var deepEqual = require('./deepEquals.js');
var hashObject = require('./hashObject.js');
var applyPatches = require('./applyPatches');

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
    // Do nothing now
    // Generate when diff
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

    if (newValue.toString() === value) {
      return unchanged[i].split("=")[0];
    }
  }
}

},{"./applyPatches":2,"./deepEquals.js":3,"./hashObject.js":4}],7:[function(require,module,exports){
/*!
 * https://github.com/Starcounter-Jack/JSON-Patch
 * json-patch-duplex.js version: 0.5.6
 * (c) 2013 Joachim Wester
 * MIT license
 */
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var OriginalError = Error;
var jsonpatch;
(function (jsonpatch) {
    /* Do nothing if module is already defined.
       Doesn't look nice, as we cannot simply put
       `!jsonpatch &&` before this immediate function call
       in TypeScript.
       */
    if (jsonpatch.observe) {
        return;
    }
    var _objectKeys = function (obj) {
        if (_isArray(obj)) {
            var keys = new Array(obj.length);
            for (var i = 0; i < keys.length; i++) {
                keys[i] = i.toString();
            }
            return keys;
        }
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                keys.push(i);
            }
        }
        return keys;
    };
    function _equals(a, b) {
        switch (typeof a) {
            case 'undefined': //backward compatibility, but really I think we should return false
            case 'boolean':
            case 'string':
            case 'number':
                return a === b;
            case 'object':
                if (a === null)
                    return b === null;
                if (_isArray(a)) {
                    if (!_isArray(b) || a.length !== b.length)
                        return false;
                    for (var i = 0, l = a.length; i < l; i++)
                        if (!_equals(a[i], b[i]))
                            return false;
                    return true;
                }
                var bKeys = _objectKeys(b);
                var bLength = bKeys.length;
                if (_objectKeys(a).length !== bLength)
                    return false;
                for (var i = 0; i < bLength; i++)
                    if (!_equals(a[i], b[i]))
                        return false;
                return true;
            default:
                return false;
        }
    }
    /* We use a Javascript hash to store each
     function. Each hash entry (property) uses
     the operation identifiers specified in rfc6902.
     In this way, we can map each patch operation
     to its dedicated function in efficient way.
     */
    /* The operations applicable to an object */
    var objOps = {
        add: function (obj, key) {
            obj[key] = this.value;
            return true;
        },
        remove: function (obj, key) {
            delete obj[key];
            return true;
        },
        replace: function (obj, key) {
            obj[key] = this.value;
            return true;
        },
        move: function (obj, key, tree) {
            var temp = { op: "_get", path: this.from };
            apply(tree, [temp]);
            apply(tree, [
                { op: "remove", path: this.from }
            ]);
            apply(tree, [
                { op: "add", path: this.path, value: temp.value }
            ]);
            return true;
        },
        copy: function (obj, key, tree) {
            var temp = { op: "_get", path: this.from };
            apply(tree, [temp]);
            apply(tree, [
                { op: "add", path: this.path, value: temp.value }
            ]);
            return true;
        },
        test: function (obj, key) {
            return _equals(obj[key], this.value);
        },
        _get: function (obj, key) {
            this.value = obj[key];
        }
    };
    /* The operations applicable to an array. Many are the same as for the object */
    var arrOps = {
        add: function (arr, i) {
            arr.splice(i, 0, this.value);
            return true;
        },
        remove: function (arr, i) {
            arr.splice(i, 1);
            return true;
        },
        replace: function (arr, i) {
            arr[i] = this.value;
            return true;
        },
        move: objOps.move,
        copy: objOps.copy,
        test: objOps.test,
        _get: objOps._get
    };
    /* The operations applicable to object root. Many are the same as for the object */
    var rootOps = {
        add: function (obj) {
            rootOps.remove.call(this, obj);
            for (var key in this.value) {
                if (this.value.hasOwnProperty(key)) {
                    obj[key] = this.value[key];
                }
            }
            return true;
        },
        remove: function (obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    objOps.remove.call(this, obj, key);
                }
            }
            return true;
        },
        replace: function (obj) {
            apply(obj, [
                { op: "remove", path: this.path }
            ]);
            apply(obj, [
                { op: "add", path: this.path, value: this.value }
            ]);
            return true;
        },
        move: objOps.move,
        copy: objOps.copy,
        test: function (obj) {
            return (JSON.stringify(obj) === JSON.stringify(this.value));
        },
        _get: function (obj) {
            this.value = obj;
        }
    };
    var observeOps = {
        add: function (patches, path) {
            var patch = {
                op: "add",
                path: path + escapePathComponent(this.name),
                value: this.object[this.name]
            };
            patches.push(patch);
        },
        'delete': function (patches, path) {
            var patch = {
                op: "remove",
                path: path + escapePathComponent(this.name)
            };
            patches.push(patch);
        },
        update: function (patches, path) {
            var patch = {
                op: "replace",
                path: path + escapePathComponent(this.name),
                value: this.object[this.name]
            };
            patches.push(patch);
        }
    };
    function escapePathComponent(str) {
        if (str.indexOf('/') === -1 && str.indexOf('~') === -1)
            return str;
        return str.replace(/~/g, '~0').replace(/\//g, '~1');
    }
    function _getPathRecursive(root, obj) {
        var found;
        for (var key in root) {
            if (root.hasOwnProperty(key)) {
                if (root[key] === obj) {
                    return escapePathComponent(key) + '/';
                }
                else if (typeof root[key] === 'object') {
                    found = _getPathRecursive(root[key], obj);
                    if (found != '') {
                        return escapePathComponent(key) + '/' + found;
                    }
                }
            }
        }
        return '';
    }
    function getPath(root, obj) {
        if (root === obj) {
            return '/';
        }
        var path = _getPathRecursive(root, obj);
        if (path === '') {
            throw new OriginalError("Object not found in root");
        }
        return '/' + path;
    }
    var beforeDict = [];
    var Mirror = (function () {
        function Mirror(obj) {
            this.observers = [];
            this.obj = obj;
        }
        return Mirror;
    })();
    var ObserverInfo = (function () {
        function ObserverInfo(callback, observer) {
            this.callback = callback;
            this.observer = observer;
        }
        return ObserverInfo;
    })();
    function getMirror(obj) {
        for (var i = 0, ilen = beforeDict.length; i < ilen; i++) {
            if (beforeDict[i].obj === obj) {
                return beforeDict[i];
            }
        }
    }
    function getObserverFromMirror(mirror, callback) {
        for (var j = 0, jlen = mirror.observers.length; j < jlen; j++) {
            if (mirror.observers[j].callback === callback) {
                return mirror.observers[j].observer;
            }
        }
    }
    function removeObserverFromMirror(mirror, observer) {
        for (var j = 0, jlen = mirror.observers.length; j < jlen; j++) {
            if (mirror.observers[j].observer === observer) {
                mirror.observers.splice(j, 1);
                return;
            }
        }
    }
    function unobserve(root, observer) {
        generate(observer);
        clearTimeout(observer.next);
        var mirror = getMirror(root);
        removeObserverFromMirror(mirror, observer);
    }
    jsonpatch.unobserve = unobserve;
    function deepClone(obj) {
        if (typeof obj === "object") {
            return JSON.parse(JSON.stringify(obj)); //Faster than ES5 clone - http://jsperf.com/deep-cloning-of-objects/5
        }
        else {
            return obj; //no need to clone primitives
        }
    }
    function observe(obj, callback) {
        var patches = [];
        var root = obj;
        var observer;
        var mirror = getMirror(obj);
        if (!mirror) {
            mirror = new Mirror(obj);
            beforeDict.push(mirror);
        }
        else {
            observer = getObserverFromMirror(mirror, callback);
        }
        if (observer) {
            return observer;
        }
        observer = {};
        mirror.value = deepClone(obj);
        if (callback) {
            //callbacks.push(callback); this has no purpose
            observer.callback = callback;
            observer.next = null;
            var intervals = this.intervals || [100, 1000, 10000, 60000];
            if (intervals.push === void 0) {
                throw new OriginalError("jsonpatch.intervals must be an array");
            }
            var currentInterval = 0;
            var dirtyCheck = function () {
                generate(observer);
            };
            var fastCheck = function () {
                clearTimeout(observer.next);
                observer.next = setTimeout(function () {
                    dirtyCheck();
                    currentInterval = 0;
                    observer.next = setTimeout(slowCheck, intervals[currentInterval++]);
                }, 0);
            };
            var slowCheck = function () {
                dirtyCheck();
                if (currentInterval == intervals.length)
                    currentInterval = intervals.length - 1;
                observer.next = setTimeout(slowCheck, intervals[currentInterval++]);
            };
            if (typeof window !== 'undefined') {
                if (window.addEventListener) {
                    window.addEventListener('mousedown', fastCheck);
                    window.addEventListener('mouseup', fastCheck);
                    window.addEventListener('keydown', fastCheck);
                }
                else {
                    document.documentElement.attachEvent('onmousedown', fastCheck);
                    document.documentElement.attachEvent('onmouseup', fastCheck);
                    document.documentElement.attachEvent('onkeydown', fastCheck);
                }
            }
            observer.next = setTimeout(slowCheck, intervals[currentInterval++]);
        }
        observer.patches = patches;
        observer.object = obj;
        mirror.observers.push(new ObserverInfo(callback, observer));
        return observer;
    }
    jsonpatch.observe = observe;
    function generate(observer) {
        var mirror;
        for (var i = 0, ilen = beforeDict.length; i < ilen; i++) {
            if (beforeDict[i].obj === observer.object) {
                mirror = beforeDict[i];
                break;
            }
        }
        _generate(mirror.value, observer.object, observer.patches, "");
        if (observer.patches.length) {
            apply(mirror.value, observer.patches);
        }
        var temp = observer.patches;
        if (temp.length > 0) {
            observer.patches = [];
            if (observer.callback) {
                observer.callback(temp);
            }
        }
        return temp;
    }
    jsonpatch.generate = generate;
    // Dirty check if obj is different from mirror, generate patches and update mirror
    function _generate(mirror, obj, patches, path) {
        var newKeys = _objectKeys(obj);
        var oldKeys = _objectKeys(mirror);
        var changed = false;
        var deleted = false;
        //if ever "move" operation is implemented here, make sure this test runs OK: "should not generate the same patch twice (move)"
        for (var t = oldKeys.length - 1; t >= 0; t--) {
            var key = oldKeys[t];
            var oldVal = mirror[key];
            if (obj.hasOwnProperty(key)) {
                var newVal = obj[key];
                if (typeof oldVal == "object" && oldVal != null && typeof newVal == "object" && newVal != null) {
                    _generate(oldVal, newVal, patches, path + "/" + escapePathComponent(key));
                }
                else {
                    if (oldVal != newVal) {
                        changed = true;
                        patches.push({ op: "replace", path: path + "/" + escapePathComponent(key), value: deepClone(newVal) });
                    }
                }
            }
            else {
                patches.push({ op: "remove", path: path + "/" + escapePathComponent(key) });
                deleted = true; // property has been deleted
            }
        }
        if (!deleted && newKeys.length == oldKeys.length) {
            return;
        }
        for (var t = 0; t < newKeys.length; t++) {
            var key = newKeys[t];
            if (!mirror.hasOwnProperty(key)) {
                patches.push({ op: "add", path: path + "/" + escapePathComponent(key), value: deepClone(obj[key]) });
            }
        }
    }
    var _isArray;
    if (Array.isArray) {
        _isArray = Array.isArray;
    }
    else {
        _isArray = function (obj) {
            return obj.push && typeof obj.length === 'number';
        };
    }
    //3x faster than cached /^\d+$/.test(str)
    function isInteger(str) {
        var i = 0;
        var len = str.length;
        var charCode;
        while (i < len) {
            charCode = str.charCodeAt(i);
            if (charCode >= 48 && charCode <= 57) {
                i++;
                continue;
            }
            return false;
        }
        return true;
    }
    /// Apply a json-patch operation on an object tree
    function apply(tree, patches, validate) {
        var result = false, p = 0, plen = patches.length, patch, key;
        while (p < plen) {
            patch = patches[p];
            p++;
            // Find the object
            var path = patch.path || "";
            var keys = path.split('/');
            var obj = tree;
            var t = 1; //skip empty element - http://jsperf.com/to-shift-or-not-to-shift
            var len = keys.length;
            var existingPathFragment = undefined;
            while (true) {
                key = keys[t];
                if (validate) {
                    if (existingPathFragment === undefined) {
                        if (obj[key] === undefined) {
                            existingPathFragment = keys.slice(0, t).join('/');
                        }
                        else if (t == len - 1) {
                            existingPathFragment = patch.path;
                        }
                        if (existingPathFragment !== undefined) {
                            this.validator(patch, p - 1, tree, existingPathFragment);
                        }
                    }
                }
                t++;
                if (key === undefined) {
                    if (t >= len) {
                        result = rootOps[patch.op].call(patch, obj, key, tree); // Apply patch
                        break;
                    }
                }
                if (_isArray(obj)) {
                    if (key === '-') {
                        key = obj.length;
                    }
                    else {
                        if (validate && !isInteger(key)) {
                            throw new JsonPatchError("Expected an unsigned base-10 integer value, making the new referenced value the array element with the zero-based index", "OPERATION_PATH_ILLEGAL_ARRAY_INDEX", p - 1, patch.path, patch);
                        }
                        key = parseInt(key, 10);
                    }
                    if (t >= len) {
                        if (validate && patch.op === "add" && key > obj.length) {
                            throw new JsonPatchError("The specified index MUST NOT be greater than the number of elements in the array", "OPERATION_VALUE_OUT_OF_BOUNDS", p - 1, patch.path, patch);
                        }
                        result = arrOps[patch.op].call(patch, obj, key, tree); // Apply patch
                        break;
                    }
                }
                else {
                    if (key && key.indexOf('~') != -1)
                        key = key.replace(/~1/g, '/').replace(/~0/g, '~'); // escape chars
                    if (t >= len) {
                        result = objOps[patch.op].call(patch, obj, key, tree); // Apply patch
                        break;
                    }
                }
                obj = obj[key];
            }
        }
        return result;
    }
    jsonpatch.apply = apply;
    function compare(tree1, tree2) {
        var patches = [];
        _generate(tree1, tree2, patches, '');
        return patches;
    }
    jsonpatch.compare = compare;
    var JsonPatchError = (function (_super) {
        __extends(JsonPatchError, _super);
        function JsonPatchError(message, name, index, operation, tree) {
            _super.call(this, message);
            this.message = message;
            this.name = name;
            this.index = index;
            this.operation = operation;
            this.tree = tree;
        }
        return JsonPatchError;
    })(OriginalError);
    jsonpatch.JsonPatchError = JsonPatchError;
    jsonpatch.Error = JsonPatchError;
    /**
     * Recursively checks whether an object has any undefined values inside.
     */
    function hasUndefined(obj) {
        if (obj === undefined) {
            return true;
        }
        if (typeof obj == "array" || typeof obj == "object") {
            for (var i in obj) {
                if (hasUndefined(obj[i])) {
                    return true;
                }
            }
        }
        return false;
    }
    jsonpatch.hasUndefined = hasUndefined;
    /**
     * Validates a single operation. Called from `jsonpatch.validate`. Throws `JsonPatchError` in case of an error.
     * @param {object} operation - operation object (patch)
     * @param {number} index - index of operation in the sequence
     * @param {object} [tree] - object where the operation is supposed to be applied
     * @param {string} [existingPathFragment] - comes along with `tree`
     */
    function validator(operation, index, tree, existingPathFragment) {
        if (typeof operation !== 'object' || operation === null || _isArray(operation)) {
            throw new JsonPatchError('Operation is not an object', 'OPERATION_NOT_AN_OBJECT', index, operation, tree);
        }
        else if (!objOps[operation.op]) {
            throw new JsonPatchError('Operation `op` property is not one of operations defined in RFC-6902', 'OPERATION_OP_INVALID', index, operation, tree);
        }
        else if (typeof operation.path !== 'string') {
            throw new JsonPatchError('Operation `path` property is not a string', 'OPERATION_PATH_INVALID', index, operation, tree);
        }
        else if ((operation.op === 'move' || operation.op === 'copy') && typeof operation.from !== 'string') {
            throw new JsonPatchError('Operation `from` property is not present (applicable in `move` and `copy` operations)', 'OPERATION_FROM_REQUIRED', index, operation, tree);
        }
        else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && operation.value === undefined) {
            throw new JsonPatchError('Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)', 'OPERATION_VALUE_REQUIRED', index, operation, tree);
        }
        else if ((operation.op === 'add' || operation.op === 'replace' || operation.op === 'test') && hasUndefined(operation.value)) {
            throw new JsonPatchError('Operation `value` property is not present (applicable in `add`, `replace` and `test` operations)', 'OPERATION_VALUE_CANNOT_CONTAIN_UNDEFINED', index, operation, tree);
        }
        else if (tree) {
            if (operation.op == "add") {
                var pathLen = operation.path.split("/").length;
                var existingPathLen = existingPathFragment.split("/").length;
                if (pathLen !== existingPathLen + 1 && pathLen !== existingPathLen) {
                    throw new JsonPatchError('Cannot perform an `add` operation at the desired path', 'OPERATION_PATH_CANNOT_ADD', index, operation, tree);
                }
            }
            else if (operation.op === 'replace' || operation.op === 'remove' || operation.op === '_get') {
                if (operation.path !== existingPathFragment) {
                    throw new JsonPatchError('Cannot perform the operation at a path that does not exist', 'OPERATION_PATH_UNRESOLVABLE', index, operation, tree);
                }
            }
            else if (operation.op === 'move' || operation.op === 'copy') {
                var existingValue = { op: "_get", path: operation.from, value: undefined };
                var error = jsonpatch.validate([existingValue], tree);
                if (error && error.name === 'OPERATION_PATH_UNRESOLVABLE') {
                    throw new JsonPatchError('Cannot perform the operation from a path that does not exist', 'OPERATION_FROM_UNRESOLVABLE', index, operation, tree);
                }
            }
        }
    }
    jsonpatch.validator = validator;
    /**
     * Validates a sequence of operations. If `tree` parameter is provided, the sequence is additionally validated against the object tree.
     * If error is encountered, returns a JsonPatchError object
     * @param sequence
     * @param tree
     * @returns {JsonPatchError|undefined}
     */
    function validate(sequence, tree) {
        try {
            if (!_isArray(sequence)) {
                throw new JsonPatchError('Patch sequence must be an array', 'SEQUENCE_NOT_AN_ARRAY');
            }
            if (tree) {
                tree = JSON.parse(JSON.stringify(tree)); //clone tree so that we can safely try applying operations
                apply.call(this, tree, sequence, true);
            }
            else {
                for (var i = 0; i < sequence.length; i++) {
                    this.validator(sequence[i], i);
                }
            }
        }
        catch (e) {
            if (e instanceof JsonPatchError) {
                return e;
            }
            else {
                throw e;
            }
        }
    }
    jsonpatch.validate = validate;
})(jsonpatch || (jsonpatch = {}));
if (typeof exports !== "undefined") {
    exports.apply = jsonpatch.apply;
    exports.observe = jsonpatch.observe;
    exports.unobserve = jsonpatch.unobserve;
    exports.generate = jsonpatch.generate;
    exports.compare = jsonpatch.compare;
    exports.validate = jsonpatch.validate;
    exports.validator = jsonpatch.validator;
    exports.JsonPatchError = jsonpatch.JsonPatchError;
    exports.Error = jsonpatch.Error;
}

},{}],8:[function(require,module,exports){
module.exports = function(str) {
  var hash = 5381,
      i    = str.length

  while(i)
    hash = (hash * 33) ^ str.charCodeAt(--i)

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, if the high bit
   * is set, unset it and add it back in through (64-bit IEEE) addition. */
  return hash >= 0 ? hash : (hash & 0x7FFFFFFF) + 0x80000000
}

},{}]},{},[1])(1)
});