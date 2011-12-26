// SC.initialize({
//   client_id: "f90eca9d4dfe9abeaf32a8f09bdf6581",
//   redirect_uri: "http://funklet.com/callback.html"
// });

var values = [];
var modifiedValues = [];
var bpm = { value: 120 };
var swing = { value: 0 };
var jds = [0, 0, 0];
var mutes = [0, 0, 0];

var readParams = function() {
  window.location.search.slice(1).split("&").forEach(function(param) {
    var ps = param.split("=");
    window[ps[0]] = ps[1];
  });
  decode();
};

var decode = function() {
  values = vals.split(";").map(function(v) {
    return v.split("").map(function(i) {
      return parseInt(i, 10);
    });
  });
  modifiedValues = mods.split(".");
  bpm.value = parseInt(b, 10);
  swing.value = parseInt(s, 10);
};

var encode = function() {
  var vs = values.map(function(vs){ return vs.join("") }).join(";");
  var ms = modifiedValues.join(".");
  console.log(["/funklet.html?vals=", vs, "&mods=", ms, "&b=", bpm.value, "&s=", swing.value].join(""));
};

readParams();

var originals = copyArray(values);
var length = values[0].length - 1;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");
var trs = toarr(diagram.querySelectorAll(".tr"));

// sample names
var names = ["hat", "snare", "kick"];
var buildNames = function(a, b) { return b.map(function(i) { return a+""+i }) };

var sampleNames = (["foothat"])
  .concat(buildNames("hat",   [1,2,3,4]))
  .concat(buildNames("ohat",  [1,2,3,4]))
  .concat(buildNames("snare", [1,2,3,4]))
  .concat(buildNames("kick",  [1,2,3,4]));

var modifiers = writeModifiersIntoTable(length+1, trs[0], modifiedValues, values[0]);
var rows = writeValuesIntoTable(values, trs.slice(1), names);

listenForModifiers(modifiers, modifiedValues, values);
listenForValuesFromRows(rows, values, 4, modifiers);
listenForBpmChange(bpm, getElement("bpm"), getElement("bpm-form"), getElement("half-time"));
listenForSwingChange(swing, getElement("swing-meter"), diagram);
listenForJdChange(jds, trs.slice(1), toarr(diagram.querySelectorAll(".jd")));
listenForMutes(mutes, toarr(diagram.querySelectorAll(".mute")), trs.slice(1));

var context = new AudioContext();
var outstandingOpen = null;

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

    (!mutes[j]) && cback(_i, vol); // yield

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
          outstandingOpen = playSampleWithBuffer(context, modifiedBuffer, 0, 0.75);
        }
        else {
          playSampleWithBuffer(context, buffer, 0, 0.75);
        }
      } else if (modified) {
        playSampleWithBuffer(context, buffers.foothat, 0, 1);
      }
    });
  };

  var snareBack = function(lag) {
    runLightsWithCallback(1, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers["snare"+vol], 0, 1);
    });
  };

  var kickBack = function(lag) {
    runLightsWithCallback(2, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers["kick"+vol], 0, 1);
    });
  };

  var start = function() {
    startButton.style.display = "none";
    stopButton.style.display = "block";
    intervals = [
      runCallbackWithMetronome(context, bpm, 4, hatBack, swing, [jds, 0]),
      runCallbackWithMetronome(context, bpm, 4, snareBack, swing, [jds, 1]),
      runCallbackWithMetronome(context, bpm, 4, kickBack, swing, [jds, 2])
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