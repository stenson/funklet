/* run the program */

var originals = copyArray(values);
var length = values[0].length - 1;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");
var bpmMeter = getElement("bpm");

var names = ["hat", "snare", "kick"];
var buildNames = function(a, b) {
  return b.map(function(i) { return a+""+i })
};
var sampleNames = buildNames("hat", [1,2,3,4,5,6,7,8])
  .concat(buildNames("snare", [1,2,3,4]))
  .concat(buildNames("kick", [1,2,3,4]));

var modifiers = writeModifiersIntoTable(length+1, diagram);
var modifiedValues = [];
var rows = writeValuesIntoTable(values, diagram, names);
var bpm = { value: parseInt(bpmMeter.value, 10) };

listenForModifiers(modifiers, modifiedValues, 4);
listenForValuesFromRows(rows, values, 4);
listenForBpmChange(bpm, bpmMeter, getElement("bpm-form"));

var context = new webkitAudioContext();
var outstandingOpen = null;

getBuffersFromSampleNames(sampleNames, context, function(buffers) {
  playSampleWithBuffer(context, buffers.kick4, 0, 0); // start the audio context

  var interval;
  var i = 0;
  
  var start = function() {
    interval = runCallbackWithMetronome(context, bpm, 4, function(lag) {
      if (lag > 0.5) stop();
      
      var last = ((i - 1) >= 0) ? (i-1) : length;

      values.forEach(function(row, j) {
        var volume = row[i];
        var prefix = names[j];
        rows[j][last].className = "td";
        rows[j][i].className = "td current";
        var buffer = buffers[prefix+""+volume];
        j === 0 && volume !== 0 && outstandingOpen && outstandingOpen.noteOff(0);
        
        if (j === 0 && modifiedValues[i] && volume !== 0) {
          buffer = buffers[prefix+""+(volume+4)];
          outstandingOpen = playSampleWithBuffer(context, buffer, 0, 0.65);
        } else {
          (volume !== 0) && playSampleWithBuffer(context, buffer, 0, 1);
        }
      }, 0);

      i = (i === length) ? 0 : (i + 1);
    });
  };
  
  var stop = function() {
    clearInterval(interval);
  };

  startButton.addEventListener("mouseup", start, true);
  stopButton.addEventListener("mouseup", stop, true);
});