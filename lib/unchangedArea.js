var deepEqual = require('./deepEquals.js');
var hashObject = require('./hashObject.js');
var applyPatches = require('./applyPatches');

exports.generateUnchanged = generateUnchanged;
exports.findValueInUnchanged = findValueInUnchanged;

function generateUnchanged(oldJson, newJson, unchanged, path) {
  
  // Not equal
  // Check the type - faster if this one goes first
  if (typeof oldJson !== typeof newJson) { return; }

  // Check if two json is the same
  // Equal
  if (deepEqual._equals(oldJson, newJson)) {
  // if (equal(oldJson, newJson)) {
    // console.log({path: path, value: copy.clone(newJson)});
    // add the same value only once
    var el = path + "=" + JSON.stringify(newJson);
    if (unchanged.indexOf(el) < 0)
      unchanged.push(el);
    return;
  }

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
    for(var i = 0, n = Math.min(oldJson.length, newJson.length); i < n; i++) {
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
  // some optimization
  var toStr = JSON.stringify(newValue), parts;
  for (var i = 0; i < unchanged.length; i++) {
  	parts = unchanged[i].split("=");
    if (toStr === parts[1]) {
      return parts[0];
    }
  }
}
