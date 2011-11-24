/* utilities */
var copyArray = function(arr) {
  arr.map(function(v) { return v.concat([]) });
};

/* sample loading */

var loadSampleWithUrl = function(context, url, callback) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    context.decodeAudioData(request.response, callback);
  };
  request.send();
};

var getBuffersFromSampleNames = function(names, context, callback) {
  var buffers = {};
  var queue = 0;

  names.map(function(name) {
    var url = ["sounds/", name, ".wav"].join("");
    queue++;
    loadSampleWithUrl(context, url, function(buffer) {
      buffers[name] = buffer;
      if (--queue === 0) callback(buffers);
    });
  });
};

/* sample playing */

var playSampleWithBuffer = function(context, buffer, start, volume) {
  var gainNode = context.createGainNode();
  var source = context.createBufferSource();

  source.buffer = buffer;
  source.connect(gainNode);
  gainNode.connect(context.destination);
  gainNode.gain.value = volume;
  source.noteOn(start);
  return source;
};

/* table writing */

var writeValueIntoCell = function(value, tr) {
  var td = cabin("div.td");
  var holder = cabin("div.td-holder");
  td.setAttribute("volume", value);
  holder.appendChild(td);
  tr.appendChild(holder);
  return td;
};

var writeValuesIntoRow = function(values, table, name) {
  var tr = cabin("div.tr."+name);
  table.appendChild(tr);
  return values.map(function(value) {
    return writeValueIntoCell(value, tr);
  });
};

var writeValuesIntoTable = function(patterns, div) {
  return patterns.map(function(values, i) {
    return writeValuesIntoRow(values, div, names[i]);
  });
};

var writeModifiersIntoTable = function(length, div) {
  var tr = cabin("div.tr.modifiers");
  var tds = [];
  for(var i = 0; i < length; i++) {
    tds.push(writeValueIntoCell(0, tr));
  }
  div.appendChild(tr);
  return tds;
};

/* listening for value changes */

var listenForValuesFromRows = function(rows, values, limit) {
  rows.forEach(function(tr, i) {
    tr.forEach(function(td, j) {
      var setVolume = function(volume) { td.setAttribute("volume", values[i][j] = volume) };

      td.addEventListener("mouseup", function(e) {
        var v = parseInt(td.getAttribute("volume"));
        setVolume(
          (e.metaKey || v === limit) ? 0
            : (e.altKey) ? limit : v + 1);
      }, true);

      td.addEventListener("mouseover", function(e) {
        e.shiftKey && setVolume(0);
      }, true);
    });
  });
};

var listenForModifiers = function(modifiers, values) {
  modifiers.forEach(function(modifier, i) {
    modifier.addEventListener("mouseup", function(e) {
      var mod = modifier.getAttribute("modified");
      if (modifier.getAttribute("modified")) {
        modifiedValues[i] = undefined;
        modifier.setAttribute("modified", false);
      } else {
        modifiedValues[i] = true;
        modifier.setAttribute("modified", true);
      }
    });
  });
};

var listenForBpmChange = function(bpm, el, form) {
  var updateBpm = function() {
    setTimeout(function() {
      var i = parseInt(el.value, 10);
      if (i && i !== bpm.value) bpm.value = i;
      el.value = bpm.value;
    }, 0);
  };

  el.addEventListener("blur", updateBpm, true);

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    updateBpm();
  });
};

var runCallbackWithMetronome = function(context, bpm, readCount, clickback) {
  var clickRate = (60 / bpm.value) / readCount;
  var lastTime = context.currentTime;

  return setInterval(function() {
    var current = context.currentTime;

    if (current > lastTime + clickRate) {
      clickRate = (60 / bpm.value) / readCount;
      lastTime += clickRate;
      clickback(current - lastTime);
    }
  }, 0);
};