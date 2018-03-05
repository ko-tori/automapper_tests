var audioCtx = new(window.AudioContext || window.webkitAudioContext)();
var source;
var data;
var startTime;
var keepcur = true;
var timesig = 4;
var beatoffset = 0;

$(function() {
  $("#timesig").slider({
    range: "max",
    min: 2,
    max: 7,
    value: 4,
    slide: function(event, ui) {
      timesig = ui.value;
    }
  });
  $("#beatoffset").slider({
    range: "max",
    min: -4,
    max: 4,
    value: 0,
    slide: function(event, ui) {
      beatoffset = ui.value;
    }
  });
});

var badbpms = [130.43478260869566, 142.85714285714286]; //because i'm retarded

Array.prototype.insert = function(index, item) {
  this.splice(index, 0, item);
};

var playbuffer = function(buffer) {
  source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.onended = function() {
    if (keepcur) playbuffer(buffer);
  };
  source.start(0);
  keepcur = true;
  startTime = audioCtx.currentTime;
};

var combinations = function(set, k) { //not safe for certain cases :o
  var a, b, ret = [];
  if (k == 1) return set;
  for (var i = 0; i < set.length - k + 1; i++) {
    a = set.slice(i, i + 1);
    b = combinations(set.slice(i + 1), k - 1);
    for (var j = 0; j < b.length; j++) {
      ret.push(a.concat(b[j]));
    }
  }
  return ret;
};

var sum = function(arr) { // sum of abs of elements of arr
  var s = 0;
  for (var i = 0; i < arr.length; i++) {
    s += Math.abs(arr[i]);
  }
  return s;
};

var arraysEqual = function(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

var arrincludes = function(arr, incl) {
  for (var i = 0; i < arr.length; i++) {
    if (arraysEqual(arr[i], incl)) return true;
  }
  return false;
};

var deletedupes = function(arr) { //ayy useless now
  for (var i = 0; i < arr.length - 1; i++) {
    if (arraysEqual(arr[i], arr[i + 1])) {
      arr.splice(i, i + 1);
      i--;
    }
  }
  return arr;
};

var getdata = function(buffer) {
  data = buffer.getChannelData(0);
  var data2 = buffer.getChannelData(1);
  for (var i = 0; i < data.length && i < data2.length; i++) {
    data[i] = (data[i] + data2[i]) / 2;
  }
  return data;
};

var getpeaks = function(data, threshold) {
  var peaksArray = [];
  var length = data.length;
  for (var i = 0; i < length;) {
    if (data[i] > threshold) {
      peaksArray.push(i);
      i += 10000;
    }
    i++;
  }
  return peaksArray;
};

var sortobj = function(stuff) {
  var sorted = [];
  for (var i in stuff)
    sorted.push([i, stuff[i]]);
  sorted.sort(function(a, b) {
    return b[1] - a[1];
  });
  return sorted;
};

var filter = function(buffer, type, callback) {
  var offlineContext = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
  var source = offlineContext.createBufferSource();
  source.buffer = buffer;
  var filter = offlineContext.createBiquadFilter();
  filter.type = type;
  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start(0);
  offlineContext.startRendering();
  offlineContext.oncomplete = function(e) {
    callback(e.renderedBuffer);
  };
};

var totempos = function(count) {
  var tempos = {};
  for (var i in count) {
    var tempo = 60 / (i / audioCtx.sampleRate).toFixed(2);
    while (tempo < 130) tempo *= 2;
    while (tempo > 260) tempo /= 2;
    var bad = false;
    for (var j = 0; j < badbpms.length; j++) { //some bpms are bad :P
      if (Math.abs(tempo - badbpms[j]) < .0001) bad = true;
    }
    if (bad) continue;
    if (tempo in tempos) {
      tempos[tempo] += count[i];
    }
    else {
      tempos[tempo] = count[i];
    }
  }
  return tempos;
};

var analyzediffs = function(peaks) {
  var freq = {};
  for (var i = 0; i < peaks.length; i++) {
    for (var j = 0; j < 10; j++) {
      if (j != 0 && i + j >= 0 && i + j < peaks.length) {
        var diff = Math.abs(peaks[i] - peaks[i + j]).toFixed(2);
        if (diff in freq) {
          freq[diff] += 1;
        }
        else {
          freq[diff] = 1;
        }
      }
    }
  }
  return freq;
};

var mergeclose = function(arr) {
  //console.log(arr);
  arr = arr.slice(0, 10);
  var ret = [];
  var combs = combinations(arr, 2);
  for (var i = 0; i < combs.length; i++) {
    var a = combs[i][0];
    var b = combs[i].slice(1, 3);
    //console.log(a,b);
    if (Math.abs(a[0] - b[0]) < 1) {
      ret.push([(a[0] * a[1] + b[0] * b[1]) / (a[1] + b[1]), a[1] + b[1]]);
      //console.log("gg:",[(a[0]*a[1]+b[0]*b[1])/(a[1]+b[1]),a[1]+b[1]]);
    }
    else {
      if (!arrincludes(ret, a)) ret.push(a);
      if (!arrincludes(ret, b)) ret.push(b);
    }
  }
  //console.log(ret);
  return (ret.sort(function(a, b) {
    if (b[1] - a[1] !== 0) {
      return b[1] - a[1];
    }
    else {
      return a[0] - b[0];
    }
  }));
};

var findoffset = function(peaks, dt) {
  //console.log(peaks.length);
  var cap = 200;
  //return 0;
  for (var i = 0; i < cap; i++)
    peaks[i] /= 44100;
  var best = [0, 0];
  var counted = {};
  for (i = 0; i < cap; i++) {
    //console.log(i);
    var ct = 0;
    if (peaks[i] in counted) continue;
    for (var j = 0; j < cap; j++) {
      //console.log(j);
      if (Math.abs(((peaks[j] - peaks[i]) % dt) / dt) < .1) {
        counted[peaks[j]] = true;
        ct += 1;
      }
    }
    if (ct > best[1]) {
      best[0] = peaks[i];
      best[1] = ct;
    }
  }
  return best[0] % (dt * 4);
};

var anal = function(buffer) {
  playbuffer(buffer);
  var threshold = .6;
  var lowpassbpms;
  var bandpassbpms;
  var highpassbpms;
  filter(buffer, "lowpass", function(rendered) {
    var lowdata = getdata(rendered);
    var peaks = getpeaks(lowdata, threshold);
    var allpeaks = peaks;
    var firstpeak = peaks[0];
    lowpassbpms = mergeclose(sortobj(totempos(analyzediffs(peaks))));

    filter(buffer, "bandpass", function(rendered) {
      var banddata = getdata(rendered);
      var peaks = getpeaks(banddata, threshold);
      allpeaks = allpeaks.concat(peaks);
      var bandpassbpms = mergeclose(sortobj(totempos(analyzediffs(peaks))));

      filter(buffer, "highpass", function(rendered) {
        var highdata = getdata(rendered);
        var peaks = getpeaks(highdata, threshold);
        allpeaks = allpeaks.concat(peaks);
        var highpassbpms = mergeclose(sortobj(totempos(analyzediffs(peaks))));

        var totalbpms = mergeclose(sortobj(totempos(analyzediffs(allpeaks))));
        let i = 0;
        for (let bpmlist of [lowpassbpms, bandpassbpms, highpassbpms, totalbpms]) {
          console.log(["Low pass: ", "Band pass: ", "High pass: ", "Total: "][i]);
          for (let bpmfreq of bpmlist) {
            console.log(bpmfreq);
          }
          i++;
        }

        let bpm = Math.round(lowpassbpms[0][0]);

        document.getElementById('disp1').innerHTML = "BPM: " + bpm;
        //console.log(lowpassoverall,bandpassoverall,highpassoverall);
        var dt = 60 / bpm;
        console.log("Finding offset...");
        var offset = findoffset(allpeaks, dt);
        console.log("Offset: " + offset);
        console.log("First peak: " + firstpeak / 44100);
        console.log("Diagnostic: " + Math.abs(firstpeak / 44100 - offset) % dt);
        var renderFrame = function() {
          requestAnimationFrame(renderFrame);
          var lol = (audioCtx.currentTime - startTime + offset + dt * beatoffset) % (timesig * dt);
          var asdf = 200 + (1 - (lol % dt) / dt) * 30;
          lol = lol / dt / 4;
          var beatdiv = document.getElementById('beat');
          beatdiv.style.height = Math.round(asdf) + "px";
          beatdiv.style.width = Math.round(asdf) + "px";
          beatdiv.style['border-radius'] = Math.round(asdf / 2) + "px";
          beatdiv.style['margin-top'] = -Math.round(asdf / 2) + "px";
          beatdiv.style['margin-left'] = -Math.round(asdf / 2) + "px";
          beatdiv.style['opacity'] = ((1 - 4*lol/timesig)*.75+.25);
        };
        renderFrame();
      });
    });
  });
};

window.onload = function() {
  var request = new XMLHttpRequest();
  //request.open('GET', '/weeb/MOMENT RING/1.mp3', true);
  request.open('GET', './weeb/Bokutachi wa Hitotsu no Hikari/1.mp3', true);
  //request.open('GET', 'audio.mp3', true);
  request.responseType = 'arraybuffer';
  request.onload = function() {
    var audioData = request.response;
    audioCtx.decodeAudioData(audioData).then(anal,
      function(e) {
        "Error with decoding audio data" + e.err;
      });
  };
  request.send();

  document.getElementById("fileupload").onchange = function() {
    var fileReader = new FileReader;
    fileReader.onload = function() {
      keepcur = false;
      source.stop();
      document.getElementById('disp1').innerHTML = "Loading...";
      var audioData = this.result;
      audioCtx.decodeAudioData(audioData).then(anal,
        function(e) {
          "Error with decoding audio data" + e.err;
        });
    };
    fileReader.readAsArrayBuffer(this.files[0]);
  };
};