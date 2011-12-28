
var names = ["hat", "snare", "kick"];
var buildNames = function(a, b) { return b.map(function(i) { return a+""+i }) };

var sampleNames = (["foothat"])
  .concat(buildNames("hat",   [1,2,3,4]))
  .concat(buildNames("ohat",  [1,2,3,4]))
  .concat(buildNames("snare", [1,2,3,4]))
  .concat(buildNames("kick",  [1,2,3,4]));

var context = new AudioContext();
var buffers;

var stack = [];
var recording = [];
var recorded = [];

var writeTrack = function(track) {
  var $div = $("<div/>").appendTo($("body"));
  track.forEach(function(a, i) {
    $div.append($("<span/>", { text: i }));
  });
};

getBuffersFromSampleNames(sampleNames, context, function(bs) {
  buffers = bs;
  playSampleWithBuffer(context, buffers.kick4, 0, 0); // start the audio context
  var i = 0;
  var hasStarted = false;

  var start = function() {
    hasStarted = true;
    runCallbackWithMetronome(context, { value: 135 }, 4, function() {
      i++;
      if (i > 16) {
        i = 1;
        // recording.length && recorded.push(recording);
        // recording = [];
      }
      //stack.length && (recording[i] = stack) && writeTrack(stack);
      $("#count").text(i);
      stack.forEach(function(args) {
        playSampleWithBuffer.apply(null, args);
      });
      stack = [];

      // for (var _i = 0, l = recorded.length; _i < l; _i++) {
      //   var track = recorded[_i];
      //   if (track) {
      //     track[i] && playSampleWithBuffer.apply(null, track[i][0]);
      //   }
      // }
    }, {value: 0}, [[0], 0]);
  };

  $(document).keydown(function(e, args) {
    (args = ({
      83: [context, buffers.snare4, 0, 1],
      66: [context, buffers.kick4, 0, 1],
      72: [context, buffers.hat2, 0, 1]
    })[e.keyCode]) && args && stack.push(args) && !hasStarted && start();
  });
});