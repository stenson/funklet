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
    var url = ["/sounds/", name, ".wav"].join("");
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

var writeModifiersIntoTable = function(length, div, modifiedValues, hats) {
  var tr = cabin("div.tr.modifiers");
  var tds = [];
  for(var i = 0; i < length; i++) {
    var td = writeValueIntoCell(0, tr);
    td.appendChild(cabin("span.plus", "+"));
    td.setAttribute("stick", hats[i] > 0);
    td.setAttribute("modified", modifiedValues[i]);
    tds.push(td);
  }
  div.appendChild(tr);
  return tds;
};

/* listening for value changes */

var listenForValuesFromRows = function(rows, values, limit, modifiers) {
  rows.forEach(function(tr, i) {
    tr.forEach(function(td, j) {
      var setVolume = function(volume) {
        td.setAttribute("volume", values[i][j] = volume);
        i === 0 && modifiers[j].setAttribute("stick", volume > 0);
      };

      td.addEventListener("mouseup", function(e) {
        var v = parseInt(td.getAttribute("volume"));
        setVolume((e.metaKey || v === limit) ? 0 : (e.altKey) ? limit : v + 1);
      }, true);

      td.addEventListener("mouseover", function(e) {
        e.shiftKey && setVolume(0);
      }, true);
    });
  });
};

var listenForModifiers = function(modifiers, modifiedValues, values) {
  modifiers.forEach(function(modifier, i) {
    var setValue = function(v) {
      modifiedValues[i] = v;
      modifier.setAttribute("modified", v);
    };

    modifier.addEventListener("mouseup", function(e) {
      setValue(parseInt(modifier.getAttribute("modified"), 10) > 0 ? 0 : 1);
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

var swing = (1/24);

var runCallbackWithMetronome = function(context, bpm, readCount, clickback, shift) {
  var clickRate = (60 / bpm.value) / readCount;
  var lastTime = context.currentTime;
  var i = 1;

  return setInterval(function() {
    var current = context.currentTime;
    var lag = current - lastTime;

    if (current > lastTime + clickRate) {
      clickback(lag);

      var shiftNext = (++i)%2 === 0;
      clickRate = (60 / bpm.value) / readCount;
      lastTime += clickRate;
      if (shiftNext) lastTime += (swing*clickRate);
      else lastTime -= (swing*clickRate);
    }
  }, 0);
};