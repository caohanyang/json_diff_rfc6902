# JSON-Diff

## INSTALL
npm install

## API
var jpn = require('./JSON-Diff');
var jpn_patch = jpn.diff(f_old, f_new);

## TEST
node diff.js

# Test 1 

OBJ_PROP_INS
This is an object where a property is added.

# Test 2 

OBJ_PROP_DEL
This is an object where a property is removed.

# Test3 

OBJ_PROP_MOD
This is an object where a property value is modified.

# Test4 

OBJ_PROP_CPY
This is an object where a property is copied.

# Test5 

OBJ_PROP_REN
This is an object where a field is renamed.