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
