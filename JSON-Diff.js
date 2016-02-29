var copy = require('./deepClone');
var equal = require('deep-equal');

function diff(oldJson, newJson) {
    console.log("===========  Data  ======================");
	console.log(JSON.stringify(oldJson));
	console.log(JSON.stringify(newJson));
    // Get the unchanged area
    var unchanged = [];
    generateUnchanged(oldJson, newJson, unchanged, '');
    console.log("===========  Unchanged  =================");
    console.log(unchanged);
    console.log("=========================================");

    // Generate the diff
	var patches = [];
	generateDiff(oldJson, newJson, patches, '');
	console.log("===========Final Patches=================");
	console.log(patches);
}

function generateUnchanged(oldJson, newJson, unchanged, path) {
    // Check if two json is the same
    // Equal
    if (equal(oldJson, newJson)) {
        // console.log({path: path, value: copy.clone(newJson)});
        unchanged.push({path: path, value: copy.clone(newJson)});
        return;
    }

    // Not equal
    // Check the type
    if (typeof oldJson != typeof newJson) return;

    // Type is the same
    if (Array.isArray(oldJson) && Array.isArray(newJson)) {
        // Array
        generateUnchangedArray(oldJson, newJson, unchanged, path);
        return;
    }

    if (typeof oldJson == "object" && oldJson != null && typeof newJson == "object"  && newJson != null) {
        // Object
        generateUnchangedObject(oldJson, newJson, unchanged, path);
        return;
    }
}

function generateUnchangedArray(oldJson, newJson, unchanged, path) {
    var miniLength = Math.min(oldJson.length, newJson.length);
    console.log("miniLength is " + miniLength);
    for (var i = 0; i < miniLength; i++) {
        generateUnchanged(oldJson[i], newJson[i], unchanged, path + "/" + i);
    }
}

function generateUnchangedObject(oldJson, newJson, unchanged, path) {
   var oldKeys = getKeys(oldJson);
   var newKeys = getKeys(newJson);

   for (var i = 0; i < oldKeys.length; i++) {
       var oldKey = oldKeys[i];
       if (newJson.hasOwnProperty(oldKey)) {
        generateUnchanged(oldJson[oldKey], newJson[oldKey], unchanged, path + "/" + oldKey);
       }
   };
}

function generateDiff(oldJson, newJson, patches, path) {

    // var a = null  object     Array.isArray: false
    // var a = 5     number
    // var a = [1,2] object     Array.isArray: true
    // var a         undefined  Array.isArray: false
    if (Array.isArray(oldJson) && Array.isArray(newJson)) {
        generateArrayDiff(oldJson, newJson, patches, path);
        return;
    }

    if (typeof oldJson == "object" && oldJson != null && typeof newJson == "object"  && newJson != null) {
        generateObjectDiff(oldJson, newJson, patches, path);
        return;
    }

    return generateValueDiff(oldJson, newJson, patches, path);
}

function generateValueDiff(oldJson, newJson, patches, path) {
    // the endpoint
    if (newJson != oldJson) {
        console.log({ op: "replace", path: path, value: copy.clone(newJson)});
        patches.push({ op: "replace", path: path, value: copy.clone(newJson)});
    }

}

function generateArrayDiff(oldJson, newJson, patches, path) {
    console.log("--------This is Array-------------");
    console.log(oldJson);
    // console.log(typeof(oldJson));
    // console.log(Array.isArray(oldJson));
}

function generateObjectDiff(oldJson, newJson, patches, path) {
    var oldKeys = getKeys(oldJson);
    var newKeys = getKeys(newJson);
    var removed = false;

    console.log("oldKeys: " + oldKeys);
    console.log("newKeys: " + newKeys);

    // Loop from the old; from lengths -1 to 0
    for (var i = oldKeys.length -1; i >= 0; i--) {
        var oldKey = oldKeys[i];
        var oldValue = oldJson[oldKey];
        
        console.log("oldKey: " + oldKey);
        console.log("oldValue: " + JSON.stringify(oldValue));

        if (newJson.hasOwnProperty(oldKey)) {
            var newValue = newJson[oldKey];

            console.log("newValue: " + JSON.stringify(newValue));
            
            // go deeper
            generateDiff(oldJson[oldKey], newJson[oldKey], patches, path + "/" + oldKey );    
            // ???? patchPointString(oldKey)

        } else {
            // Remove
            console.log({ op: "remove", path: path + "/" + patchPointString(oldKey) });
            removed = true;
            patches.push({ op: "remove", path: path + "/" + patchPointString(oldKey) });
        }

    }

    // If doesn't remove and the length is the same, return
    // Return: only the length is equal and doesn't remove
    if (!removed && newKeys.length == oldKeys.length) return;

    // Loop from the new
    // length is not the same
    for (var j = 0; j < newKeys.length; j ++) {
        var newKey = newKeys[j];
        var newValue = newJson[newKey];
        if (!oldJson.hasOwnProperty(newKey)) {
            console.log({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newValue)});
            patches.push({ op: "add", path: path + "/" + patchPointString(newKey), value: copy.clone(newValue)});
        } 
    }
}

function getKeys(json) {
    
   	return Object.keys(json);

}

function patchPointString(str) {

    // According to RFC 6901
    // '~' needs to be encoded as '~0'
    // '/' needs to be encoded as '~1'
	if (str.indexOf('/') === -1 && str.indexOf('~') === -1)
	    return str;
	return str.replace(/~/g, '~0').replace(/\//g, '~1');
}



exports = module.exports.diff = diff;