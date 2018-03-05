var parser = require('osu-parser');
var images = require("images");
var fs = require('fs');
var stream = fs.createReadStream("maps/39804 xi - FREEDOM DiVE/xi - FREEDOM DiVE (Nakagawa-Kanon) [FOUR DIMENSIONS].osu");

var distance = function(obj1, obj2) {
  if(obj1['objectName'] == 'spinner' || obj2['objectName'] == 'spinner')  return 0;
  var p1 = obj1['objectName'] == 'slider' ? obj1['endPosition'] : obj1['position'];
  var p2 = obj2['position'];
  return magnitude([p2[0] - p1[0],p2[1] - p1[1]]);
};

var dot = function(v1, v2){
  return v1[0] * v2[0] + v1[1] * v2[1];
};

var magnitude = function(v){
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
};

var degrees = function(rads){
  return rads/Math.PI*180;
};

var radians = function(degs){
  return degs*Math.PI/180;
};

var angle = function(obj1,obj2,obj3){
  if(obj3 == undefined && obj2['objectName'] != 'slider') console.error("You need three objects if the second one isn't a slider!");
  if(obj1['objectName'] == 'spinner' || obj2['objectName'] == 'spinner' || obj3['objectName'] == 'spinner') console.error("There's a spinner in there!");
  var p1 = obj1['objectName'] == 'slider' ? obj1['endPosition'] : obj1['position'];
  var p2 = obj2['position'];
  var v1 = [p2[0]-p1[0],p2[1]-p1[1]];
  var v2;
  if(obj2['objectName'] == 'slider'){
    var pt = obj2['points'][1];
    v2 = [pt[1]-p2[0],pt[1]-p2[1]];
  }
  else{
    var p3 = obj3['position'];
    v2 = [p3[0]-p2[0],p3[1]-p2[1]];
  }
  return (-Math.atan2(v2[1], v2[0]) - Math.atan2(v1[1], v1[0]))%Math.PI;
};

var sortedhist = function(h){
  var l = [];
  for(var k in h){
    l.push([k,parseInt(h[k])]);
  }
  l.sort(function(a,b){return b[1] - a[1]});
  return l;
};

var multiplier = function(obj1, obj2, timingPoint, sliderMultiplier) {
  var dist = distance(obj1, obj2);
  var dt = obj2['startTime'] - (obj1['objectName'] == 'slider' ? obj1['endTime'] : obj1['startTime']);
  var beats = dt / timingPoint['beatLength'];
  return ((dist / 100).toFixed(2) / beats / timingPoint['velocity'] / sliderMultiplier).toFixed(2);
};

parser.parseStream(stream, function(err, beatmap) {
  if(err){
    console.log("Unable to read beatmap!");
    return;
  }
  var ahist = {};
  var objects = beatmap['hitObjects'];
  var timingPoints = beatmap['timingPoints'];
  var breaks = beatmap['breakTimes'];
  var sliderMultiplier = beatmap['SliderMultiplier'];
  var curimg = images(2048,1536);
  curimg.fill(0,0,0);
  var num = 1;
  for (var i = 1; i < objects.length; i++) {
    var cur = objects[i - 1];
    if(cur['newCombo']){
      curimg.save('imgs/'+i+'.png');
      return;
      curimg = images(2048,1536);
      curimg.fill(0,0,0);
      num = 1;
    }
    var next = objects[i];
    var a = '';
    if(i>2){
      var prev = objects[i-2];
      a = degrees(angle(prev,cur,next));
      var temp = Math.abs(Math.round(a));
      if(ahist[temp]){
        ahist[temp]+=1;
      }
      else{
        ahist[temp]=1;
      }
    }
    if(cur['objectName']=='circle'){
      //curimg.draw(images('skin/hitcircle.png'),2*cur['position'][0],2*cur['position'][1]);
      curimg.draw(images('skin/default-'+num+'.png'),64-17.5+2*cur['position'][0],64-26+2*cur['position'][1]);
    }
    else if(cur['objectName']=='slider'){
      //console.log(cur['points'].length);
      for(var j = 0; j < cur['points'].length; j++){
        curimg.draw(images('skin/sliderbody.png'),2*cur['points'][j][0],2*cur['points'][j][1]);
      }
      //curimg.draw(images('skin/hitcircle.png'),2*cur['position'][0],2*cur['position'][1]);
      curimg.draw(images('skin/default-'+num+'.png'),64-17.5+2*cur['position'][0],64-26+2*cur['position'][1]);
    }
    num++;
    var t = next['startTime'];
    while (timingPoints.length > 1 && timingPoints[1]['offset'] <= t) timingPoints.splice(0, 1);
    console.log(multiplier(cur,next,timingPoints[0],sliderMultiplier), a);
  }
  //console.log(sortedhist(ahist));
});