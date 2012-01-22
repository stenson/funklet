var values = ([0,0,0]).map(function() { return emptyArray(32) });
var modifiedValues = emptyArray(32);
var bpm = { value: 120 };
var swing = { value: 0 };
var jds = [0, 0, 0];
var mutes = [0, 0, 0];
var rates = [1, 1, 1];
var alts = [0, 0, 0];

(function readParams() {
  window.location.search.slice(1).split("&").forEach(function(param) {
    var ps = param.split("=");
    window[ps[0]] = ps[1];
  });

  if (window.vals) values = splitToCallback(vals.split(";"), "", parseInt);
  if (window.mods) modifiedValues = splitToCallback([mods], ".", parseInt)[0];
  if (window.b) bpm.value = parseInt(b, 10);
  if (window.s) swing.value = parseInt(s, 10);
  if (window.jd) jds = splitToCallback([jd], ",", parseFloat)[0];
})();

var originals = copyArray(values);
var length = 31;

// dom elements
var getElement = document.getElementById.bind(document);
var diagram = getElement("diagram");
var startButton = getElement("start");
var stopButton = getElement("stop");
var trs = toarr(diagram.querySelectorAll(".tr"));

var bffs = {
  hat: { c: "hat", o: "hat", a: "cbell" },
  ohat: { c: "ohat", o: "ohat", a: "obell" },
  snare: { c: "snare", o: "snare", a: "click" },
  kick: { c: "kick", o: "kick", a: "kick" },
};

// sample names
var names = [bffs.hat.o, bffs.snare.o, bffs.kick.o];
var buildNames = function(a, b) { return b.map(function(i) { return a+""+i }) };

var sampleNames = (["foothat", "spring"])
  .concat(buildNames(bffs.hat.o,   [1,2,3,4]))
  .concat(buildNames(bffs.hat.a,   [1,2,3,4]))
  .concat(buildNames(bffs.ohat.o,  [1,2,3,4]))
  .concat(buildNames(bffs.ohat.a,  [1,2,3,4]))
  .concat(buildNames(bffs.snare.o, [1,2,3,4]))
  .concat(buildNames(bffs.snare.a, [1,2,3,4]))
  .concat(buildNames(bffs.kick.o,  [1,2,3,4]));

var modifiers = writeModifiersIntoTable(length+1, trs[0], modifiedValues, values[0]);
var rows = writeValuesIntoTable(values, trs.slice(1), names);

listenForModifiers(modifiers, modifiedValues, values);
listenForValuesFromRows(rows, values, 4, modifiers);
listenForBpmChange(bpm, getElement("bpm"), getElement("bpm-form"), getElement("half-time"));
listenForSwingChange(swing, getElement("swing-meter"), diagram);

var arrFromSel = function(sel) {
  return toarr(diagram.querySelectorAll(sel));
};
listenForJdChange(jds, arrFromSel(".jd"), trs.slice(1));
listenForMutes(mutes, arrFromSel(".mute"), trs.slice(1));
listenForRateChanges(rates, arrFromSel(".rate"), trs.slice(1));
listenForAlts(alts, bffs, arrFromSel(".alt"), trs.slice(1));

var dryEffectGain = 1.0;
var wetEffectGain = 0.1;

var context = new AudioContext();
var convolver = context.createConvolver();
var compressor = context.createDynamicsCompressor();
var gainNode = context.createGainNode();
var effectNode = context.createGainNode();

compressor.connect(context.destination);

gainNode.gain.value = 1.0;
gainNode.connect(context.destination);
effectNode.gain.value = 1.0;
effectNode.connect(compressor);
convolver.connect(effectNode);

var outstandingOpen = null;
var buffers = {};

var play = function() {
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
      var buffer = buffers[bffs.hat.c + vol];
      var modifiedBuffer = buffers[bffs.ohat.c + vol];

      if (outstandingOpen && (vol || modified)) {
        outstandingOpen.noteOff(0); // kill the ringing hat
        outstandingOpen = null;
      }

      if (vol) {
        if (modified) {
          outstandingOpen = playSampleWithBuffer(context, modifiedBuffer, 0, 1, rates[0]);
        }
        else {
          playSampleWithBuffer(context, buffer, 0, 1, rates[0]);
        }
      } else if (modified) {
        playSampleWithBuffer(context, buffers.foothat, 0, 1, rates[0]);
      }
    });
  };

  var snareBack = function(lag) {
    runLightsWithCallback(1, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers[bffs.snare.c+vol], 0, 1, rates[1]);
    });
  };

  var kickBack = function(lag) {
    if (lag > 2) return stop();

    runLightsWithCallback(2, function(_i, vol) {
      vol && playSampleWithBuffer(context, buffers[bffs.kick.c+vol], 0, 1, rates[2]);
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

  listenForSave(getElement("save"), function() {
    stop();
    alert([
      "/funklet.html?vals=", values.map(function(vs){ return vs.join("") }).join(";"),
      "&mods=", modifiedValues.join(".").replace(/NaN|0/g, ""),
      "&b=", bpm.value,
      "&s=", (swing.value*12),
      "&jd=", jds.join(",")
    ].join(""));
  });
};

getBuffersFromSampleNames(["spring"], context, function(b) {
  convolver.buffer = b.spring;
  playSampleWithBuffer(context, b.spring, 0, 1); // start the audio context
  play();
});

getBuffersFromSampleNames(sampleNames, context, function(bs) {
  buffers = bs;
});