module.exports.LCS = LCS;

function LCS (x, y, unchanged, patches, path) {
  //get the trimed sequence
  var start = 0;
  var x_end = x.length - 1;
  var y_end = y.length - 1;
  //trim off the sequence in the beginning
  while (start <= x_end && start <= y_end && x[start] == y[start]) {
     start++;
  }

  //trim off the sequence in the end
  while (start <= x_end && start <= y_end && x[x_end] == y[y_end]) {
     x_end--;
     y_end--;
  }
  
  var newX = x.slice(start, x_end + 1);
  var newY = y.slice(start, y_end + 1);

  // console.log("NEWX: " + newX);
  // console.log("NEWY: " + newY);

  var matrix = LCSMatrix(newX, newY);
  var result = LCSResult(newX, newY, matrix);
  // console.log("Result trim: " + result);
  var finalResult = x.slice(0, start) + result + x.slice(x_end + 1, x.length);
  // For Array 
  // var finalResult = x.slice(0, start).join("") + result + x.slice(x_end + 1, x.length).join("");
  console.log("Result: " + finalResult);

  // Set offset = 1
  var offset = {};
  offset.value = 1;
  // pass offset reference 
  printDiff(newX, newY, matrix, newX.length - 1, newY.length -1, start, offset, unchanged, patches, path);

}

function LCSMatrix(x, y) {
    var x_length = x.length;
    var y_length = y.length;
	// Create a two dimention array
	var matrix = new Array(x_length + 1);
	for (var i = 0; i <= x_length; i++) {
		matrix[i] = new Array(y_length + 1);
	};

	// fill the first column
	for (var m = 0; m <= x_length; m++) {
		matrix[m][0] = 0;
	};
	// fill the first row
	for (var n = 0; n <= y_length; n++) {
		matrix[0][n] = 0;
	};

    // LCS
    for (var i = 0; i < x_length; i++) {
    	for(var j = 0; j < y_length; j++) {
          if (x[i] == y[j]){
             matrix[i+1][j+1] = matrix[i][j] + 1;
          } else {
          	 matrix[i+1][j+1] = Math.max(matrix[i+1][j], matrix[i][j+1]);
          }

    	};
    };

    // console.log(matrix);
    console.log("LCSLength = " + matrix[x_length][y_length]);
    // return matrix[x_length][y_length];
    return matrix;
}

function LCSResult(x, y, matrix) {
   return backtrack(x, y, matrix, x.length - 1, y.length - 1);
}

function backtrack(x, y, matrix, i, j) {

   if (i == -1 || j == -1) {
   	 return ""; 
   } else if (x[i] == y[j]) {
     return backtrack(x, y, matrix, i-1, j-1) + x[i];
   } else {

   	 if (matrix[i+1][j] >= matrix[i][j+1]) {
   	 	return backtrack(x, y, matrix, i, j-1);
   	 } else {
   	 	return backtrack(x, y, matrix, i-1, j);
   	 }
   	 
   }
}

function printDiff(x, y, matrix, i, j, start, offset, unchanged, patches, path) {
  if (i > -1 && j > -1 && x[i] == y[j]) {

    printDiff(x, y, matrix, i-1, j-1, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log(" " + x[i]+ " i=" +i);

  } else if (j > -1 && (i == -1 || matrix[i+1][j] >= matrix[i][j+1])) {
    // console.log("add " + y[j]);

    printDiff(x, y, matrix, i, j-1, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log("i =  " + i);
    //First add
    console.log({  op: "add", path: path + "/" + (i + start + offset.value), value: y[j] });
    patches.push({ op: "add", path: path + "/" + (i + start + offset.value), value: JSON.parse(y[j]) });
    //Then change offset
    offset.value++;

  } else if (i > -1 && (j == -1 || matrix[i+1][j] < matrix[i][j+1])) {
    // console.log("remove " + x[i]);

    printDiff(x, y, matrix, i-1, j, start, offset, unchanged, patches, path);
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log("i =  " + i);
    //First change offset
    offset.value--;
    //Then remove
    console.log({  op: "remove", path: path + "/" + (i + start + offset.value), value: x[i] });
    patches.push({ op: "remove", path: path + "/" + (i + start + offset.value), value: JSON.parse(x[i]) });
  } else {
    // console.log("-----------------------------------");
    // console.log("offset " + offset.value);
    // console.log("reach the end i = " + i);
  }
}