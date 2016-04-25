var applyPatches = require('./lib/applyPatches');
var unchangedArea = require('./lib/unchangedArea.js');
var patchArea = require('./lib/patchArea.js');
var hashObject = require('./lib/hashObject.js');

exports.diff = diff;
exports.apply = apply;

// browserify -s jdr -e JSON-Diff.js -o json-diff-rfc6902.js
var OBJ_COM = true;
var ARR_COM = true;
var HASH_ID = null;

function apply(app_old, jpn_patch) {
  applyPatches.apply(app_old, jpn_patch);
}

function diff(oldJson, newJson, options) {
  // Initial
  if(typeof options === 'object') {
    if(options.OBJ_COM !== void 0) {OBJ_COM = options.OBJ_COM;}
    if(options.ARR_COM !== void 0) {ARR_COM = options.ARR_COM;}
    if(options.HASH_ID !== void 0) {HASH_ID = options.HASH_ID;}
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
  if (oldJson.length === 0 && newJson.length ===0 ) {return;}

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
  var x = hashObject.mapArray(hashObject.hash, oldJson, HASH_ID);
  var y = hashObject.mapArray(hashObject.hash, newJson, HASH_ID);

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
          arrPatch.push({op: "move", value: y_sorted[j].value, valueOld: x_sorted[i].value, from: x_sorted[i].index , index: y_sorted[j].index, hash: y_sorted[j].hash });
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
             if (JSON.stringify(arrPatch[m].valueOld) === JSON.stringify(arrPatch[m].value)) {

               arrUnchanged.push(arrPatch[m]);
               arrPatch.splice(m, 1);
               continue;
             } else {
               //If index is the same, go to the internal node
               var tmMove = [];
               generateDiff(arrPatch[m].valueOld, arrPatch[m].value, unchanged, tmMove, path + "/" + arrPatch[m].index);

               // Remove current move in the patch.
               arrPatch.splice(m,1);
               arrtmp = arrtmp.concat(tmMove);
               continue;
             }

           }

           arrtmp.push({op: "move", from: path + '/' + arrPatch[m].from, path: path + '/' + arrPatch[m].index});

           break;
    }

    m++;

  }

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

  return arrtmp;

}
