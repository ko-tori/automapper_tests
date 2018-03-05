window.AudioContext=window.AudioContext||window.webkitAudioContext||window.mozAudioContext;

var analyser, audio;

function add(a, b) {
    return a + b;
}

window.onload = function() {
    var ctx = new AudioContext();
    audio = document.getElementById('hi');
    var audioSrc = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    audioSrc.connect(analyser);
    audioSrc.connect(ctx.destination);

    var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    var totdata = [];

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        analyser.getByteFrequencyData(frequencyData);
        var vis = $("#vis");
        vis.empty();
        var tot = 0;
        var step = sliderv;
        for(var i = 0; i<1024; i+=step){
            var sub = frequencyData.slice(i,i+step).reduce(add, 0);
            tot += sub;
            var w = sub/step;
            vis.append('<div class="bar" style="height:'+Math.round(step*(.3+w/512))+'px;width:'+w+'px;background-color:rgb('+255+','+Math.round(255-w/3)+',0);"></div>');
        }
        totdata.push(tot);
        var graph = $("#graph");
        while(graph.children().length>=192){
            graph.find(":nth-child(2)").remove();
        }
        var h=Math.round(tot/1024);
        graph.append('<div class="graphbar", style="top:'+(128-h)+'px;height:'+h+'px;background-color:rgb('+255+','+Math.round(255-h)+',0);"></div>');
        
        
    }
    var toggleplaying = function(){
        if(audio.paused){
            audio.play();
            renderFrame();
        }
        else{
            audio.pause();
        }
    };
    $("#vis").click(toggleplaying);
    toggleplaying();
    document.getElementById("fileupload").onchange = function(){
        var files = this.files;
        var file = URL.createObjectURL(files[0]);
        var hi = document.getElementById("hi");
        hi.src = file; 
        hi.play();
    };
};