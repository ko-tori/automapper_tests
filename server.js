var express = require('express');
var fs = require('fs');
var ejs = require('ejs');
var path = require('path');

var app = express();
app.use(express.static(__dirname + '/'));

app.get('/', function(req, res){
    
});

app.use(express.static('public'));

app.listen(8080);