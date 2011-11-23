/* run the program */

var originals = copyArray(values);
var length = values[0].length - 1;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");

var indicators = writeIndicatorsIntoTable(length+1, diagram);
var rows = writeValuesIntoTable(values, diagram);
listenForValuesFromRows(rows, values, 4);

var bpm = { value: 100 };
listenForBpmChange(bpm, getElement("bpm"), getElement("bpm-form"));

var context = new webkitAudioContext();

var names = ["hat", "snare", "kick"];
var individuals = names.map(function(base) {
  return [1,2,3,4].map(function(i) { return base+""+i });
}).reduce(function(a, b) { return a.concat(b) });
console.log(individuals);

getBuffersFromSampleNames(individuals, context, function(buffers) {
  playSampleWithBuffer(context, buffers.kick4, 0, 0); // start the audio context

  var interval;
  var i = 0;
  
  var start = function() {
    interval = runCallbackWithMetronome(context, bpm, 4, function(lag) {
      var last = ((i - 1) >= 0) ? (i-1) : length;

      var totalVolume = values.reduce(function(acc, row, j) {
        var volume = row[i];
        rows[j][last].className = "td";
        rows[j][i].className = "td current";
        (volume !== 0) && playSampleWithBuffer(context, buffers[names[j]+""+volume], 0, 1);
        return acc + volume;
      }, 0);

      i = (i === length) ? 0 : (i + 1);
    });
  };
  
  var stop = function() {
    clearInterval(interval);
  };

  startButton.addEventListener("mouseup", start, true);
  stopButton.addEventListener("mouseup", stop, true);
  //window.addEventListener("blur", stop, true);
});