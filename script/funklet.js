var originals = copyArray(values);
var length = values[0].length - 1;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");
var bpmMeter = getElement("bpm");
var swingMeter = getElement("swing-meter");
//var line = getElement("line");
var width = diagram.clientWidth;

// sample names
var names = ["hat", "snare", "kick"];
var buildNames = function(a, b) { return b.map(function(i) { return a+""+i }) };

var sampleNames = (["foothat"])
  .concat(buildNames("hat",   [1,2,3,4]))
  .concat(buildNames("ohat",  [1,2,3,4]))
  .concat(buildNames("snare", [1,2,3,4]))
  .concat(buildNames("kick",  [1,2,3,4]));

var modifiedValues = [];
mods.forEach(function(mod) {
  modifiedValues[mod[0]*4 + mod[1]] = 1;
});
var modifiers = writeModifiersIntoTable(length+1, diagram, modifiedValues, values[0]);
var rows = writeValuesIntoTable(values, diagram, names);
var bpm = { value: parseInt(bpmMeter.value, 10) };

var swing = {};

listenForModifiers(modifiers, modifiedValues, values);
listenForValuesFromRows(rows, values, 4, modifiers);
listenForBpmChange(bpm, bpmMeter, getElement("bpm-form"));
listenForSwingChange(swing, swingMeter, diagram);

var context = new webkitAudioContext();
var outstandingOpen = null;
var left = 5;

var print = function() {
  console.log("var values = [\n", values.map(function(vs) {
    return "  [" + vs.join(", ") + "]";
  }).join(",\n"), "\n]");
};

getBuffersFromSampleNames(sampleNames, context, function(buffers) {
  playSampleWithBuffer(context, buffers.kick4, 0, 0); // start the audio context

  var interval;
  var i = 0;

  var metronomeClickback = function(lag) {
    if (lag > 0.5) stop();

    var last = ((i - 1) >= 0) ? (i-1) : length;
    left = rows[0][i].offsetLeft;
    //line.style.left = (left) + "px";

    values.forEach(function(row, j) {
      var volume = row[i];
      var prefix = names[j];
      rows[j][last].className = "td";
      rows[j][i].className = "td current";
      var buffer = buffers[prefix+""+volume];

      if (j === 0) { // hat row, more complicated
        var modified = modifiedValues[i];
        var modifiedBuffer = buffers["o" + prefix + "" + volume];

        if (outstandingOpen && (volume || modified)) {
          outstandingOpen.noteOff(0); // kill the ringing hat
          oustandingOpen = null;
        }

        if (volume) {
          if (modified) {
            outstandingOpen = playSampleWithBuffer(context, buffers["o" + prefix + "" + volume], 0, 0.85);
          }
          else {
            playSampleWithBuffer(context, buffer, 0, 1);
          }
        } else if (modified) {
          playSampleWithBuffer(context, buffers.foothat, 0, 1);
        }
      } else if (volume !== 0) { // bass and snare
        playSampleWithBuffer(context, buffer, 0, 1);
      }
    }, 0);

    i = (i === length) ? 0 : (i + 1);
  };

  var start = function() {
    startButton.style.display = "none";
    stopButton.style.display = "block";
    interval = runCallbackWithMetronome(context, bpm, 4, metronomeClickback, swing);
  };

  var stop = function() {
    i = 0;
    stopButton.style.display = "none";
    startButton.style.display = "block";
    clearInterval(interval);
  };

  startButton.addEventListener("mouseup", start, true);
  stopButton.addEventListener("mouseup", stop, true);
  startButton.style.visibility = "visible";
});