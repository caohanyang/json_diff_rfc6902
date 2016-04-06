var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');
var hashObject = require('./hashObject.js');
var applyPatches = require('./applyPatches');

exports.LCS = LCS;
exports.sortBack = sortBack;

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
          // When equal, don't change
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

function sortBack(oldJson, newJson, unchanged, patches, patchHashes, path) {
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
  var arrPatch = [], arrUnchanged = [];
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
          arrPatch.push({op: "remove",  index: x_sorted[i].index});
          i++;
        }

      } else {
        arrPatch.push({op: "add", value: y_sorted[j].value, index: y_sorted[j].index, hash: y_sorted[j].hash });
        j++;
      }

    }

    if (i < x_sorted.length) {
      // Remove the rest elements of the x_sorted
      arrPatch.push({op: "remove",  index: x_sorted[i].index });
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
           if (arrPatch[m-1] !== void 0) {
             if (arrPatch[m-1].op === 'remove' && arrPatch[m-1].index === arrPatch[m].index) {
               arrPatch[m].op = 'replace';
               arrPatch.splice(m-1,1);
               continue;
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
           }
           break;
      case 'remove':
           arrPatch[m].index = transformIndex(arrPatch[m], m, arrPatch);
           break;
      case 'move':
           arrPatch[m].from = transformIndex(arrPatch[m], m, arrPatch);
           if (arrPatch[m].index === arrPatch[m].from) {
             arrUnchanged.push(arrPatch[m]);
             arrPatch.splice(m, 1);
             continue;
           }
           break;
    }
    m++;
  }

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

  return arrPatch;
//   arrRemove = arrRemove.map(function(obj) {
//     obj.path = path + '/' + obj.index;
//     delete obj.hash;
//     delete obj.index;
//     if (obj.op === 'move') {
//       obj.from = path + '/' + obj.from;
//       delete obj.value;
//     }
//     return obj;
//   });
//   arrAdd = arrAdd.sort(function(a,b) {return a.index - b.index;});
//   arrAdd = arrAdd.map(function(obj, i) {
//     // var pointer = unchangedArea.findValueInUnchanged(obj.hash, unchanged);
//     // if (pointer) {
//     //   var newPointerArr = pointer.split('/');
//     //   var initIndex = parseInt(newPointerArr[newPointerArr.length - 1]);
//     //   obj.path = path + '/' + obj.index;
//     //   obj.from = path + '/' + initIndex;
//     //   obj.op = "copy";
//     //   delete obj.value;
//     // } else {
//       obj.path = path + '/' + obj.index;
//     // }
//
//     // Adjust the index in the unchangedArea
//     // for (var i = 0; i < unchanged.length; i++) {
//     //   if (obj.index <= unchanged[i].index) {
//     //     unchanged[i].index ++;
//     //   }
//     // }
//
//     delete obj.hash;
//     delete obj.index;
//     return obj;
//   });
//
//   //Handle Replace need to be change
//   if (arrRemove.length !== 0 && arrAdd.length !== 0) {
//     if (arrRemove[arrRemove.length - 1].path === arrAdd[0].path) {
//       arrAdd[0].op = "replace";
//       arrRemove.pop();
//     }
//   }
//
//   arrPatch = arrRemove.concat(arrAdd);
//
//
//   //Adjust the index
//   var x_tmp = x.slice();
//   applyPatches.apply(x_tmp, arrPatch);
//
//   var adjustPatch = [];
//   var x1 = [];
//   //remove the same element
//   for (var m = 0; m< x_tmp.length; m++) {
//     if (x_tmp[m].hash === y[m].hash) {
//       delete x_tmp[m];
//       delete y[m];
//     } else {
//       x_tmp[m]
//     }
//   }
//
//   for (var m = 0; m < x_tmp.length; m++) {
//     if (x_tmp[m].hash === y[m].hash) {continue;}
//
//     for (var n = 0; n < y.length; n++) {
//       if (x_tmp[m].hash === y[n].hash) {
//         adjustPatch.push({op: "move", from: m, path: n});
//       }
//     }
//   }
//
// adjustPatch = adjustPatch.sort(function(a, b) {return a.path - b.path;});
// // var finalPatch = [];
// var from_a, path_a, from_b;
//
//  for (var i = 0; i < adjustPatch.length; i++) {
//    from_a = adjustPatch[i].from;
//    path_a = adjustPatch[i].path;
//    if (from_a !== path_a) {
//      // Handle patch
//      patches.push({op: "move", from: path + "/" + from_a, path: path + "/" + path_a });
//      // Hanle index
//      for (var j = i + 1; j < adjustPatch.length; j++) {
//        from_b = adjustPatch[j].from;
//        if (from_b >= Math.min(from_a, path_a) && from_b <= Math.max(from_a, path_a)) {
//           adjustPatch[j].from ++;
//        }
//      }
//    }
//  }
//
// patches = arrPatch.concat(patches);
//
// return patches;

}


function LCS (x, y, oldJson, newJson, unchanged, patches, patchHashes, path) {
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
  printDiff(newX, newY, oldJson, newJson, matrix, newX.length - 1, newY.length -1, start, offset, unchanged, patches, patchHashes, path);
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


function printDiff(x, y, oldJson, newJson, matrix, i, j, start, offset, unchanged, patches, patchHashes, path) {
  if (i > -1 && j > -1 && x[i] === y[j]) {

    printDiff(x, y, oldJson, newJson, matrix, i-1, j-1, start, offset, unchanged, patches, patchHashes, path);

  } else if (j > -1 && (i === -1 || matrix[i+1][j] >= matrix[i][j+1])) {

    printDiff(x, y, oldJson, newJson, matrix, i, j-1, start, offset, unchanged, patches, patchHashes, path);

    // First Add or Replace
    var lastElement = patches[patches.length - 1];
    var tmpPath = path + "/" + (i + start + offset.value);

    if (lastElement !== void 0) {
      // lastElement = JSON.parse(lastElement);
      if (lastElement.op === "remove" && lastElement.path === tmpPath) {
        //First Replace
        lastElement.op = "replace";
        lastElement.value = newJson[j+start];

        var lastHash = patchHashes[patchHashes.length - 1];
        lastHash.op = "replace";
        lastHash.value = y[j];
        // patches.splice(patches.length - 1, 1, JSON.stringify(lastElement));

      } else {
        addCopyMove(x, y, oldJson, newJson, matrix, i, j, start, offset, unchanged, patches, patchHashes, path, tmpPath);
      }
    } else {
      addCopyMove(x, y, oldJson, newJson, matrix, i, j, start, offset, unchanged, patches, patchHashes, path, tmpPath);
    }
    //Then change offset
    offset.value++;

  } else if (i > -1 && (j === -1 || matrix[i+1][j] < matrix[i][j+1])) {

    printDiff(x, y, oldJson, newJson, matrix, i-1, j, start, offset, unchanged, patches, patchHashes, path);
    //First change offset
    offset.value--;
    //Then remove
    // console.log({  op: "remove", path: path + "/" + (i + start + offset.value), value: x[i] });
    patchHashes.push({ op: "remove", path: path + "/" + (i + start + offset.value), value: x[i] });
    patches.push({ op: "remove", path: path + "/" + (i + start + offset.value), value: oldJson[i+start] });
  } else {
    // console.log("reach the end i = " + i);
  }
}

function addCopyMove(x, y, oldJson, newJson, matrix, i, j, start, offset, unchanged, patches, patchHashes, path, tmpPath) {
  // First MOVE or ADD or COPY
  // var templeOps = hashObject({ op: "remove", path: tmpPath, value: JSON.parse(y[j])});
  var previousIndex = patchArea.findValueInPatchHashes(y[j], patchHashes);
  // var previousIndex = -1;  //save 4ms
  // //
  // ********Need to be fiexed*****************
  // only move when the previousIndex is 0 and patchLength is 1
  // if (previousIndex !== -1)
  if (previousIndex === 0 && patches.length === 1) {
    // MOVE
    var oldPath = patches[previousIndex].path;
    // console.log({  op: "move", from: oldPath, path: tmpPath});
    patchHashes.splice(previousIndex, 1);
    patches.splice(previousIndex, 1);
    patchHashes.push({ op: "move", from: oldPath, path: tmpPath});
    patches.push({ op: "move", from: oldPath, path: tmpPath});
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
          patchHashes.push({ op: "copy", path: tmpPath, from: newPointer });
          patches.push({ op: "copy", path: tmpPath, from: newPointer });
        }
      } else {
        // newIndex < 0, hence the element doesn't exist in the array, add
        patchHashes.push({ op: "add", path: tmpPath, value: y[j] });
        patches.push({ op: "add", path: tmpPath, value: newJson[j+start] });
        // patches.push({ op: "add", path: tmpPath, value: newJson[j] });
      }
    } else {
      // ADD
      patchHashes.push({ op: "add", path: tmpPath, value: y[j] });
      patches.push({ op: "add", path: tmpPath, value: newJson[j+start] });

    }
  }
}
