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
