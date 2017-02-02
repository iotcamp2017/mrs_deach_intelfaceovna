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


/* Reading values*/

var fft = require('fft-js').fft,
    fftUtil = require('fft-js').util;
var analogPin0 = new mraa.Aio(0); //setup access analog input Analog pin #0 (A0)
var pwm3 = new mraa.Pwm(9);
pwm3.enable(true);

var real = [];
var both,four_both,four_both_weighed = [];
var hits_per_second = [0,0,0,0];
var hits_per_second_old = [0,0,0,0];
var out_magnitude, out_color, out_fade; //выходные параметры
var is_hit; //признак удара
var four_min=0, four_max=0, four_min_value, four_max_value;
var i,j;

/* настраиваемые параметры */

//вторая частота отключена данными настройками
var magnitude_param = [1000, 10000, 2000, 3000];
var magnitude_param_min = [1000, 10000, 2000, 3000];
var magnitude_param_many_multiplier = [2.5, 2.5, 40, 40];
var magnitude_param_little_multiplier = [200, 300, 250, 400];
var magnitude_param_D_multiplier = [10, 10, 100, 80];
var magnitude_weighed_noise = [4,6,9.7,11];
//настройки числа ударов по частотным областям
var hits_per_second_min = [1,1,0,1];//1 1 0 1
var hits_per_second_max = [4,2,0,3];//4 2 0 3
var hits_per_second_counter = [0,0,0,0];
var weight = [0.7,1,1.4,1.7]; //ручная настройка выбора области

// Будем вызывать функцию через каждые 10 мс
setInterval(periodicFFT,15);
function periodicFFT() {
    for (i = 0; i < 128; i++){
        real[i] = analogPin0.read();
    }
    var phasors= fft(real);
    var frequencies = fftUtil.fftFreq(phasors, 44100), // Sample rate and coef is just used for length, and frequency step
    magnitudes = fftUtil.fftMag(phasors); 
    both = frequencies.map(function (f, ix) {
        return {x: Math.round(f), y: magnitudes[ix]};
    });
    both.splice(0, 1);
    
    //преобразование массива для вывода четырёх областей
    var t1=0,t2=0,t3=0,t4=0;
    t1=magnitudes[1];
    t2=magnitudes[2] + magnitudes[3];
    for (i=5; i<18; i++) t3 = t3 + magnitudes[i];
    for (i=20; i<60; i++) t4 = t4 + magnitudes[i];
    
    var magnitudes_sum = t1 + t2 + t3 + t4;
    
    four_both = [];
    four_both.push({x: 345, y: t1});
    four_both.push({x: 800, y: t2});
    four_both.push({x: 3500, y: t3});
    four_both.push({x: 8000, y: t4});
    //взвешенный массив
    four_both_weighed = [];
    four_both_weighed.push({x: 345, y: t1});
    four_both_weighed.push({x: 800, y: t2});
    four_both_weighed.push({x: 3500, y: t3});
    four_both_weighed.push({x: 8000, y: t4});
    
    //проверка на удар
    is_hit = false;
    for (i = 0; i < 4; i++) {
      if (four_both[i].y > magnitude_param[i]){
          is_hit = true;
          hit();
          hits_per_second_counter[i]++;
      }
   }
    
    
    //Логарифмируем
    for (j=0; j<4; j++){
        four_both_weighed[j].y = Math.log2(four_both_weighed[j].y);
    }
    //вычитаем шум
        for (j=0; j<4; j++){
        four_both_weighed[j].y = four_both_weighed[j].y - magnitude_weighed_noise[j];
    }
    //учитываем вес указанный вручную
    for (j=0; j<4; j++){
    four_both_weighed[j].y = four_both_weighed[j].y * weight[j];
    }
    
    //поиск минимума и максимума из 4 областей
    four_min = 0;
    four_max = 0;
    four_min_value = four_both_weighed[0].y;
    four_max_value = four_both_weighed[0].y;
    for (j=1; j<4; j++){
        if (four_both_weighed[j].y > four_max_value){
            four_max_value = four_both_weighed[j].y;
            four_max = j;
        }
        if (four_both_weighed[j].y < four_min_value){
            four_min_value = four_both_weighed[j].y;
            four_min = j;
        }
    }
    //console.log("four_min: " + four_min + " four_max: " + four_max + " four_min_value: " +  four_min_value + " four_max_value: " + four_max_value);
            
    //применяем ручной вес
    
    if (is_hit){
        //выравнивание силы относительно выборанного порога
        for (j=0; j<4; j++){
            //four_both_weighed[j].y = four_both_weighed[j].y / magnitude_param[j]* weight[j] / magnitudes_sum;
        }
        
        //исходное значение было примерно от 0 до 8
        out_magnitude = (four_both_weighed[four_max].y * magnitudes_sum - 1)/7;
        pwm3.write(out_magnitude);
        switch (four_max) {
              case 0:
                out_color = four_both_weighed[0].y;// / (four_both_weighed[1].y/2);
                break;
              case 1:
                out_color = four_both_weighed[1].y;// / (four_both_weighed[0].y + four_both_weighed[2].y);
                break;
              case 2:
                out_color = four_both_weighed[2].y;// / (four_both_weighed[1].y + four_both_weighed[3].y);
                break;
              case 3:
                out_color = four_both_weighed[3].y;// / (four_both_weighed[2].y/2);
                break;
            default:
            }
        //out_color - число примерно от 0 до 255;
        //console.log(out_color);
        out_color = ((out_color/8*90));
        out_color = out_color + 90*four_max;
    }
    else{
        pwm3.write(0);
    }
    
    //myOnboardLed.write(is_hit?1:0);
}

//визуализирует удар
function hit(){
    
}

// Рассчитывает количество ударов в секунду hits_per_second
// и 
// Будем вызывать функцию через каждые 1000 мс
setInterval(periodicHits_per_interval,1000);

var little = [1,1,1,1];
var many = [1,1,1,1];
var err_dif = [0,0,0,0];
function periodicHits_per_interval(){
    for (var j=0; j<4; j++){
    hits_per_second[j] = hits_per_second_counter[j];
    hits_per_second_counter[j] = 0;
    
    //изменяем порог при слишком частых или редких ударах
        if (hits_per_second[j] > hits_per_second_max[j]){
            //console.log("j: " + j + " hits_per_second[j]: " + hits_per_second[j] + " hits_per_second_max[j]: " +  hits_per_second_max[j]);
            err_dif[j] = hits_per_second[j]-hits_per_second_old[j];
            var overage = (hits_per_second_max[j] - hits_per_second_min[j])/2;
            magnitude_param[j] = magnitude_param[j] + (hits_per_second[j]-overage) * magnitude_param_many_multiplier[j] * many[j];
            if (err_dif[j]>0) magnitude_param[j] = magnitude_param[j] + magnitude_param_D_multiplier[j]/err_dif[j];
            //if (j==0) console.log("many hits in " + j + ": " + hits_per_second[j] + " magnitude_param: " + magnitude_param[j] /*+ " lin: " + (hits_per_second[j]-2) * magnitude_param_many_multiplier[j] + " dif: " + magnitude_param_D_multiplier[j]/err_dif[j]*/);
            many[j] = many[j]+ err_dif[j];
        }
        else many[j] = 1;

        if (hits_per_second[j] < hits_per_second_min[j]){
            err_dif[j] = hits_per_second_old[j]-hits_per_second[j];
            magnitude_param[j] = magnitude_param[j] - little[j]*magnitude_param_little_multiplier[j];
            if (err_dif[j]>0) magnitude_param[j] = magnitude_param[j] - magnitude_param_D_multiplier[j]/err_dif[j];
            if (magnitude_param[j] < magnitude_param_min[j]){
                magnitude_param[j] = magnitude_param_min[j];
                little[j] = 1;
            }
            //if (j==0) console.log("little hits in " + j + ": " + hits_per_second[j] + " magnitude_param: " + magnitude_param[j] /*+ " lin: " + little[j]*magnitude_param_little_multiplier[j] + " dif: " + magnitude_param_D_multiplier[j]/err_dif[j]*/);
            little[j] = little[j] + err_dif[j];
        }
        else little[j] = 1;
    }
    //console.log(hits_per_second);
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
    
    res.send(JSON.stringify(four_both_weighed));
    
    return;
});

app.get('/getHitsPerSecond', function(req, res) {
    
    res.setHeader('Content-Type', 'text/html');
    
    res.send(JSON.stringify(out_color));
    
    return;
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));


http.listen(3000, function(){
    console.log('Web server Active listening on *:3000');
});