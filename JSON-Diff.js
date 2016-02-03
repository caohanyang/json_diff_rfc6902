var copy = require('./deepClone');

function diff(oldJson, newJson) {
	console.log(JSON.stringify(oldJson));
	console.log(JSON.stringify(newJson));
	var patches = [];
	generateDiff(oldJson, newJson, patches, '');
	console.log("===========Final Patches=================");
	console.log(patches);
}

function generateDiff(oldJson, newJson, patches, path) {

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
    console.log("========This is Array================");
    console.log(oldJson);
    console.log(typeof(oldJson));
    console.log(Array.isArray(oldJson));
}

function generateObjectDiff(oldJson, newJson, patches, path) {
    var oldKeys = getKeys(oldJson);
    var newKeys = getKeys(newJson);
    var removed = false;

    console.log("oldKeys: " + oldKeys);
    console.log("newKeys: " + newKeys);

    // Loop from the old
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

	if (str.indexOf('/') === -1 && str.indexOf('~') === -1)
	    return str;
	return str.replace(/~/g, '~0').replace(/\//g, '~1');
}



exports = module.exports.diff = diff;