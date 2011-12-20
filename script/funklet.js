// SC.initialize({
//   client_id: "f90eca9d4dfe9abeaf32a8f09bdf6581",
//   redirect_uri: "http://funklet.com/callback.html"
// });

var originals = copyArray(values);
var length = values[0].length - 1;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");
var bpmMeter = getElement("bpm");
var swingMeter = getElement("swing-meter");
var width = diagram.clientWidth;
var trs = [].slice.apply(diagram.querySelectorAll(".tr"));

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
var modifiers = writeModifiersIntoTable(length+1, trs[0], modifiedValues, values[0]);
var rows = writeValuesIntoTable(values, trs.slice(1), names);
var bpm = { value: parseInt(bpmMeter.value, 10) };

var swing = {};
var jd = [0, 0, 0];

listenForModifiers(modifiers, modifiedValues, values);
listenForValuesFromRows(rows, values, 4, modifiers);
listenForBpmChange(bpm, bpmMeter, getElement("bpm-form"));
listenForSwingChange(swing, swingMeter, diagram);
listenForJdChange(jd, [].slice.apply(diagram.querySelectorAll(".hat, .snare, .kick")));

var context = new AudioContext();
var outstandingOpen = null;

var print = function() {
  console.log("var values = [\n", values.map(function(vs) {
    return "  [" + vs.join(", ") + "]";
  }).join(",\n"), "\n]");
};

getBuffersFromSampleNames(sampleNames, context, function(buffers) {
  playSampleWithBuffer(context, buffers.kick4, 0, 0); // start the audio context

  var intervals = [];

  var i = [0,0,0];

  var runLightsWithCallback = function(j, cback) {
    var _i = i[j];
    var last = ((_i - 1) >= 0) ? (_i-1) : length;
    var vol = values[j][_i];

    rows[j][last].className = "td";
    rows[j][_i].className = "td current";

    cback(_i, vol); // yield

    i[j] = (_i === length) ? 0 : (_i + 1);
  };

  var hatBack = function(lag) {
    runLightsWithCallback(0, function(_i, vol) {
      var modified = modifiedValues[_i];
      var buffer = buffers["hat" + vol];
      var modifiedBuffer = buffers["ohat" + vol];

      if (outstandingOpen && (vol || modified)) {
        outstandingOpen.noteOff(0); // kill the ringing hat
        outstandingOpen = null;
      }

      if (vol) {
        if (modified) {
          outstandingOpen = playSampleWithBuffer(context, modifiedBuffer, 0, 0.85);
        }
        else {
          playSampleWithBuffer(context, buffer, 0, 1);
        }
      } else if (modified) {
        playSampleWithBuffer(context, buffers.foothat, 0, 1);
      }
    });
  };

  var snareBack = function(lag) {
    runLightsWithCallback(1, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers["snare"+""+vol], 0, 1);
    });
  };

  var kickBack = function(lag) {
    runLightsWithCallback(2, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers["kick"+""+vol], 0, 1);
    });
  };

  var start = function() {
    startButton.style.display = "none";
    stopButton.style.display = "block";
    intervals = [
      runCallbackWithMetronome(context, bpm, 4, hatBack, swing, [jd, 0]),
      runCallbackWithMetronome(context, bpm, 4, snareBack, swing, [jd, 1]),
      runCallbackWithMetronome(context, bpm, 4, kickBack, swing, [jd, 2])
    ];
  };

  var stop = function() {
    i = [0,0,0]; // reset counters to start
    stopButton.style.display = "none";
    startButton.style.display = "block";
    intervals.map(clearInterval);
  };

  startButton.addEventListener("mouseup", start, true);
  stopButton.addEventListener("mouseup", stop, true);
  startButton.style.visibility = "visible";
});