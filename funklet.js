/* run the program */

var originals = copyArray(values);
var length = values[0].length - 1;

var volumes = {
  4: 1,
  3: 0.5,
  2: 0.25,
  1: 0.15
};

var getElement = document.getElementById.bind(document);

// dom elements
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");

var indicators = writeIndicatorsIntoTable(length+1, diagram);
var rows = writeValuesIntoTable(values, diagram);
listenForValuesFromRows(rows, values, 4);

var bpm = { value: 100 };
listenForBpmChange(bpm, getElement("bpm"), getElement("bpm-form"));

var context = new webkitAudioContext();
var names = ["hihat", "snare", "kick"];

getBuffersFromSampleNames(names, context, function(buffers) {
  playSampleWithBuffer(context, buffers.kick, 0, 0); // start the audio context

  var interval;
  var i = 0;

  startButton.addEventListener("mouseup", function() {
    interval = runCallbackWithMetronome(context, bpm, 4, function(lag) {
      var last = ((i - 1) >= 0) ? (i-1) : length;

      var totalVolume = values.reduce(function(acc, row, j) {
        var volume = row[i];
        rows[j][last].className = "td";
        rows[j][i].className = "td current";
        (volume !== 0) && playSampleWithBuffer(context, buffers[names[j]], 0, volumes[volume]);
        return acc + volume;
      }, 0);

      i = (i === length) ? 0 : (i + 1);
    });
  }, true);

  stopButton.addEventListener("mouseup", function() {
    clearInterval(interval);
  }, true);
});