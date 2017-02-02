/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

/*
The Web Sockets Node.js sample application distributed within Intel® XDK IoT Edition under the IoT with Node.js Projects project creation option showcases how to use the socket.io NodeJS module to enable real time communication between clients and the development board via a web browser to toggle the state of the onboard LED.

MRAA - Low Level Skeleton Library for Communication on GNU/Linux platforms
Library in C/C++ to interface with Galileo & other Intel platforms, in a structured and sane API with port nanmes/numbering that match boards & with bindings to javascript & python.

Steps for installing/updating MRAA & UPM Library on Intel IoT Platforms with IoTDevKit Linux* image
Using a ssh client: 
1. echo "src maa-upm http://iotdk.intel.com/repos/1.1/intelgalactic" > /etc/opkg/intel-iotdk.conf
2. opkg update
3. opkg upgrade

OR
In Intel XDK IoT Edition under the Develop Tab (for Internet of Things Embedded Application)
Develop Tab
1. Connect to board via the IoT Device Drop down (Add Manual Connection or pick device in list)
2. Press the "Settings" button
3. Click the "Update libraries on board" option

Review README.md file for in-depth information about web sockets communication

*/

var mraa = require('mraa'); //require mraa
console.log('MRAA Version: ' + mraa.getVersion()); //write the mraa version to the Intel XDK console
//var myOnboardLed = new mraa.Gpio(3, false, true); //LED hooked up to digital pin (or built in pin on Galileo Gen1)
var myOnboardLed = new mraa.Gpio(13); //LED hooked up to digital pin 13 (or built in pin on Intel Galileo Gen2 as well as Intel Edison)
myOnboardLed.dir(mraa.DIR_OUT); //set the gpio direction to output
var ledState = true; //Boolean to hold the state of Led

/* Reading values*/

var fft = require('fft-js').fft,
    fftUtil = require('fft-js').util;
var analogPin0 = new mraa.Aio(0); //setup access analog input Analog pin #0 (A0)

var real = [];
var both;
var is_hit; //признак удара
var magnitude_param = 3000;
var hits_per_second = 0;
var hits_per_second_counter = 0;

// Будем вызывать функцию через каждые 10 мс
setInterval(periodicFFT,10);

function periodicFFT() {
    
  for (var i = 0; i < 128; i++){
      real[i] = analogPin0.read();
  }

var phasors= fft(real);
var frequencies = fftUtil.fftFreq(phasors, 44100), // Sample rate and coef is just used for length, and frequency step
    magnitudes = fftUtil.fftMag(phasors); 
both = frequencies.map(function (f, ix) {
    return {x: Math.round(f), y: magnitudes[ix]};
});
    both.splice(0, 1);
    
    var phasors2= fft(real);
var frequencies2 = fftUtil.fftFreq(phasors2, 1000), // Sample rate and coef is just used for length, and frequency step
    magnitudes2 = fftUtil.fftMag(phasors2); 
both2 = frequencies2.map(function (f2, ix) {
    return {x: Math.round(f2), y: magnitudes2[ix]};
});
    
        both2.splice(0, 1);
    
    //проверка на удар
    is_hit = false;
    for (i = 0; i < both.length; i++) {
      if (both[i].y > magnitude_param){
          is_hit = true;
          hit();
          hits_per_second_counter++;
          console.log(both.length +  ' ' + both2.length);
      }
   }
    
    myOnboardLed.write(is_hit?1:0);
}

//визуализирует удар
function hit(){
    
}
//спускание после удара

// Рассчитывает количество ударов в секунду hits_per_second
// и 
// Будем вызывать функцию через каждые 1000 мс
setInterval(periodicHits_per_interval,1000);

var little = 1;
var many = 1;
function periodicHits_per_interval(){
    hits_per_second = hits_per_second_counter;
    hits_per_second_counter = 0;
    
    //изменяем порог при слишком частых или редких ударах
    if (hits_per_second > 6){
        magnitude_param = magnitude_param + (hits_per_second-5) * 10 * many;
        console.log("many hits: " + hits_per_second + " magnitude_param: " + magnitude_param);
        many = many*2.5;
    }
    else many = 1;
    
    if (hits_per_second < 1){
        magnitude_param = magnitude_param - 300*little;
        if (magnitude_param < 2000){
            magnitude_param = 2000;
            little = 1;
        }
        console.log("little hits: " + hits_per_second + " magnitude_param: " + magnitude_param);
        little = little*2;
    }
    else little = 1;
}

/*  */

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);

var connectedUsersArray = [];
var userId;

var old_time, new_time;

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

app.get('/getPointsGraph', function(req, res) {
    
    res.setHeader('Content-Type', 'text/html');
    
    res.send(JSON.stringify(both));
    
    return;
});

app.get('/getHitsPerSecond', function(req, res) {
    
    res.setHeader('Content-Type', 'text/html');
    
    res.send(JSON.stringify(hits_per_second));
    
    return;
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));


http.listen(3000, function(){
    console.log('Web server Active listening on *:3000');
});