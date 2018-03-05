var AV = require('av');
var fs = require('fs');
var stream = fs.createReadStream("../weeb/MOMENT RING/1.mp3");

var decodeAudioData = function(buffer, done) {
  var asset = AV.Asset.fromBuffer(buffer)

  asset.on('error', function(err) {
    done(err)
  })

  asset.decodeToBuffer(function(decoded) {
    var deinterleaved = []
      , numberOfChannels = asset.format.channelsPerFrame
      , length = Math.floor(decoded.length / numberOfChannels)
      , ch, chArray, i

    for (ch = 0; ch < numberOfChannels; ch++)
      deinterleaved.push(new Float32Array(length))

    for (ch = 0; ch < numberOfChannels; ch++) {
      chArray = deinterleaved[ch]
      for (i = 0; i < length; i++)
        chArray[i] = decoded[ch + i * numberOfChannels]
    }

    done(null, AudioBuffer.fromArray(deinterleaved, asset.format.sampleRate))
  })
}