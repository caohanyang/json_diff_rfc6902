var unchangedArea = require('./unchangedArea.js');
var patchArea = require('./patchArea.js');

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

  console.time("matrix");
  var matrix = lcsMatrix(newX, newY);
  console.timeEnd("matrix");
  //backtrack
  // var result = lcsResult(newX, newY, matrix);
  // var finalResult = x.slice(0, start) + result + x.slice(x_end + 1, x.length);
  // For Array
  // console.log("Result: " + finalResult);

  // Set offset = 1, offset is the array index adjuster for JSON format patch
  var offset = {};
  offset.value = 1;
  // pass offset reference
  console.time("printDiff");
  printDiff(newX, newY, matrix, newX.length - 1, newY.length -1, start, offset, unchanged, patches, path);
  console.timeEnd("printDiff");
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

function hashObject(obj) {
  //Default hash
  return JSON.stringify(obj);

  //String-hash
  // return hash(obj);
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
    patches.push(hashObject({ op: "remove", path: path + "/" + (i + start + offset.value), value: JSON.parse(x[i]) }));
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
    patches.push(hashObject({ op: "move", from: oldPath, path: tmpPath}));
  } else {
    // ADD OR COPY
    //Try to find the value in the unchanged area
    // var pointer = unchangedArea.findValueInUnchanged(y[j], unchanged);
    var pointer = null;  // save 5ms
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
          patches.push(hashObject({ op: "copy", path: tmpPath, from: newPointer }));
        }
      } else {
        // newIndex < 0, hence the element doesn't exist in the array, add
        patches.push(hashObject({ op: "add", path: tmpPath, value: JSON.parse(y[j]) }));
        // patches.push({ op: "add", path: tmpPath, value: newJson[j] });
      }
    } else {
      // ADD
      patches.push(hashObject({ op: "add", path: tmpPath, value: JSON.parse(y[j]) }));
      // patches.push({ op: "add", path: tmpPath, value:  newJson[j] });

    }
  }
}
