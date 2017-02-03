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
var hits_per_second_counter = [0,0,0,0];
var stable_counter = [0,0,0,0];
var rebuild_counter = [0,0,0,0];
var out_magnitude, out_color, out_fade; //выходные параметры
var is_hit; //признак удара
var four_min=0, four_max=0, four_min_value, four_max_value;
var i,j;

/* настраиваемые параметры */

var magnitude_param = [4, 3, 3, 3];
var magnitude_param_min = [4, 3, 3, 3];
var magnitude_param_many_multiplier = [0.1, 0.1, 0.07, 0.07];//умножается на разницу текущего и среднего числа удраров
var magnitude_param_little_multiplier = [0.4, 0.4, 0.4, 0.3];//вычитается статично
var magnitude_param_D_multiplier = [0.02, 0.06, 0.06, 0.02];//умножается на разницу текущего и среднего числа ударов и накапливается
//настройки числа ударов по частотным областям
var hits_per_second_min = [1,1,0,1];//1 1 0 1
var hits_per_second_max = [5,2,0,3];//4 2 0 3
var weight = [0.7,1,1.4,1.7]; //ручная настройка выбора области
var magnitude_weighed_noise = [4,6,9.7,11];
var stable_choice=-1;

/* RGB part */
//Initialize PWM on Digital Pin #3 (D3) and enable the pwm pin
var red = new mraa.Pwm(3);
var green = new mraa.Pwm(5);
var blue = new mraa.Pwm(6);
red.enable(true);
green.enable(true);
blue.enable(true);

//set the period in microseconds.
red.period_us(2000);
green.period_us(2000);
blue.period_us(2000);
green.pulsewidth_us(10);
red.pulsewidth_us(10);
var value = 0.0;

var _rgb = ConvertRangeToRGB(0,100);
console.log(_rgb);
red.write(_rgb[0]/255);
green.write(_rgb[1]/255);
blue.write(_rgb[2]/255);

//Merry Christmas mode
/*var i=1;
while (true){

_rgb = ConvertRangeToRGB(i,100);
console.log(_rgb);
red.write(_rgb[0]/255);
green.write(_rgb[1]/255);
blue.write(_rgb[2]/255);
i=i+1;
if (i>360) {i=1}
}*/

function HSLToRGB(h, s, l){
var r, g, b;

if(s == 0){
    r = g = b = l; // achromatic
}else{
    var hue2rgb = function hue2rgb(p, q, t){
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function ConvertRangeToRGB(num, lightness){ 
    // console.log((num/360), 1, lightness/100*.5);
    return HSLToRGB((num/360), 1, lightness/100*.5); //was num/100*360
}

/*var val = 100;
var dif = 1;
setInterval(function () {
if ((val < 1)||(val > 100)) {dif = -dif;}

_rgb1 = ConvertRangeToRGB(122,val);
val = val -dif;
console.log(val);
red.write(_rgb1[0]/255);
green.write(_rgb1[1]/255);
blue.write(_rgb1[2]/255);
}, 100);
*/

var oldNum=0,
oldLightness = 0;


// Будем вызывать функцию анализа спектра через каждые 15 мс
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
    
    // логарифмируем
    var sum=0;
    for (j=0; j<4; j++){
        four_both_weighed[j].y = Math.log2(four_both_weighed[j].y);
    }
    // вычитаем шум
        for (j=0; j<4; j++){
        four_both_weighed[j].y = four_both_weighed[j].y - magnitude_weighed_noise[j];
    }
    // учитываем вес, указанный вручную
    for (j=0; j<4; j++){
        four_both_weighed[j].y = four_both_weighed[j].y * weight[j];
        sum = sum + four_both_weighed[j].y;
    }
    
    // поиск минимума и максимума из 4 областей
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
    
    //окончательный выбор
    if (stable_choice==-1){
        //появляется новый выбор
         stable_choice = four_max;
        stable_counter[stable_choice] = 0;
    }
    else{
        //чтобы сойти с этой дорожки, нужно накопить 3 ошибки или накопить 240 стабильностей - примерно 4 секунды
        if ((rebuild_counter[stable_choice]>7) || (stable_counter[stable_choice] > 240)){
            console.log(stable_counter[stable_choice]);
            stable_choice=-1;
            stable_counter[stable_choice] = 0;
            rebuild_counter[stable_choice] = 0;
        }
        else{
            stable_counter[stable_choice]++;
            //сохраняем предыдущее значение частоты stable_choice
        }
    }
    if (stable_choice==-1) stable_choice = four_max;
    
    //проверка максимального пика на удар
    is_hit = false;
    if (four_both_weighed[stable_choice].y > magnitude_param[stable_choice]){
        //console.log("four_both_weighed[0].y: " + four_both_weighed[0].y + "magnitude_param[0]: " + magnitude_param[0]);
        is_hit = true;
        hits_per_second_counter[stable_choice]++;
    }
    
    if (is_hit){
        
        //исходное значение four_both_weighed[stable_choice].y примерно от 0 до 8
        out_magnitude = (four_both_weighed[stable_choice].y - 1)/7;
        pwm3.write(out_magnitude);

        out_color = four_both_weighed[stable_choice].y;

        //console.log("sum: " + sum + " out_color: " + out_color);
        out_color = (out_color*(sum - 5)/20/8*90);
        //console.log(" out_color: " + out_color);
        out_color = out_color + 90*stable_choice;
        
        if (hits_per_second[stable_choice]>0) out_fade = 1/hits_per_second[stable_choice]*1000;
        else out_fade = 1000;
        //console.log("hits_per_second[stable_choice]: " + hits_per_second[stable_choice] + " out_fade: " + out_fade);
        
        //здесь запускать функцию удара
        //hit();
        is_hit = false;
    }
    else{
        pwm3.write(0);
    }
    
    //myOnboardLed.write(is_hit?1:0);
}

setInterval(function(){
hit(Math.random()*360, 100,1000);},2000); 

//визуализирует удар
function hit(nNum,nLightness,tFall){
var difference=Math.round((nNum-oldNum)/80),
lightnessDif = (nLightness - oldLightness)/80;
//За 20 итераций плавно приходим по цвету к новому - nNumп приблизительно

var counter1 = 0;

var interval1 = setInterval (function (){
    counter1++;
    curLightness = oldLightness;
    hitRgb = ConvertRangeToRGB(oldNum, Math.round(oldLightness));
    oldNum = oldNum+difference;
    oldLightness = oldLightness + lightnessDif;
    red.write(hitRgb[0]/255);
    green.write(hitRgb[1]/255);
    blue.write(hitRgb[2]/255);
    console.log('color:', hitRgb,'Lightness',Math.round(oldLightness) );

    if(counter1 > 80){

        clearInterval(interval1);
        oldNum = nNum;

        var Interval2 = setInterval(function () {
        hitRgb = ConvertRangeToRGB(nNum,nLightness);
        nLightness = nLightness-1;
        red.write(hitRgb[0]/255);
        green.write(hitRgb[1]/255);
        blue.write(hitRgb[2]/255);
        //console.log('color:', hitRgb,'Lightness',nLightness);
        oldLightness = nLightness;
        if ((nLightness < 1) || (is_hit==true)) {clearInterval(Interval2);}
        }, Math.round(tFall/nLightness));

    }
},0.5);
// новый цвет затухает

}

// Рассчитывает количество ударов в секунду hits_per_second
// и 
// Будем вызывать функцию через каждые 1000 мс
setInterval(periodicHits_per_interval,1000);

var little = [0,0,0,0];
var many = [0,0,0,0];
var err_dif = [0,0,0,0];
function periodicHits_per_interval(){
    for (var j=0; j<4; j++){
    hits_per_second[j] = hits_per_second_counter[j];
    hits_per_second_counter[j] = 0;
    
    //изменяем порог при слишком частых или редких ударах
        if (hits_per_second[j] > hits_per_second_max[j]){
            rebuild_counter[j]++;
            //console.log("j: " + j + " hits_per_second[j]: " + hits_per_second[j] + " hits_per_second_max[j]: " +  hits_per_second_max[j]);
            err_dif[j] = hits_per_second[j]-hits_per_second_old[j];
            var overage = (hits_per_second_max[j] - hits_per_second_min[j])/2;
            magnitude_param[j] = magnitude_param[j] + (hits_per_second[j]-overage) * magnitude_param_many_multiplier[j] + many[j];
            //console.log("many hits in " + j + ": " + hits_per_second[j] + " magnitude_param: " + magnitude_param[j] + " lin: " + (hits_per_second[j]-2) * magnitude_param_many_multiplier[j] + " dif: " + many[j]);
            many[j] = many[j]+ err_dif[j]*magnitude_param_D_multiplier[j];
        }
        else many[j] = 0;

        if (hits_per_second[j] < hits_per_second_min[j]){
            rebuild_counter[j]++;
            err_dif[j] = hits_per_second_old[j]-hits_per_second[j];
            magnitude_param[j] = magnitude_param[j] - magnitude_param_little_multiplier[j] - little[j];
            if (magnitude_param[j] < magnitude_param_min[j]){
                magnitude_param[j] = magnitude_param_min[j];
                little[j] = 0;
            }
            //console.log("little hits in " + j + ": " + hits_per_second[j] + " magnitude_param: " + magnitude_param[j] + " lin: " + magnitude_param_little_multiplier[j] + " dif: " + many[j]);
            little[j] = little[j] + err_dif[j]*magnitude_param_D_multiplier[j]*2;
        }
        else little[j] = 0;
    }
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