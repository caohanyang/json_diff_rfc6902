var deepEqual = require('./deepEquals.js');
exports.findValueInPatch = findValueInPatch;
exports.handlePatch = handlePatch;

function findValueInPatch(newValue, patches) {

  var patchValue;
  for (var i = 0; i < patches.length; i++) {
    patchValue = patches[i].value;
    if (deepEqual._equals(newValue, typeof patchValue === "string"? patchValue: JSON.stringify(patchValue)) && patches[i].op === 'remove') {
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
