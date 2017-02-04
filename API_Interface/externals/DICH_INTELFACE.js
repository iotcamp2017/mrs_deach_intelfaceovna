var path = require('path');

var API = require(path.resolve(path.dirname(require.main.filename), 'externals/iot.api.js')); //рекварим нашу api-библиотеку ОБЩЕГО сервера
var INTERFACE = {}; //тут мы будет описывать всё, что на экспорт

var API_UUID = API.registerInfrastructure('DICH IntelFace', {}); // регаемся в нашей API-библиотеке и получаем уникальный ID, 
                                                                 // с которым мы потом всё время к ней обращаемся

INTERFACE.coordServiceUuid = null; //coordServiceUuid нашего bluetooth на Genuino

API.registerNobleServiceUUID(API_UUID, INTERFACE.coordServiceUuid); // наш coordServiceUuid ОБЯЗАТЕЛЬНО! нужно сообщить API
                                                                    //ВНИМАНИЕ! ОСОБЕННО АКТУАЛЬНО ДЛЯ КОМАНДЫ PolyTop!!!
                                                                    //В ФУНКЦИЮ API.registerNobleServiceUUID МОЖНО ПЕРЕДАВАТЬ КАК ОДИН (string)UUID (если он один)
                                                                    //ТАК И МАССИВ ИЗ [(string)UUID, ...] (если их несколько)!!!!!!!!!!!!

INTERFACE.data = {}; //этот объект будет передаваться API при динамическом обновлении данных

INTERFACE.data.status = 'Всё ок:)'; 
INTERFACE.data.mode = 0; /*0 - static light; 1 - colormusic; 2 - gradient*/

API.registerDrawHTMLCallback(API_UUID, function(){ // функция, отвечающая за отрисовку html-кода в блок на странице
    return '';
});

INTERFACE.emitSocket = function(sock, data){return true;}; //эта функция объявляется на Вашем сервере, когда нужно затригать сокет клиенту 

INTERFACE.init = function(noble){ //this function contains all the main functionality
    
    INTERFACE.data.status = 'Играем светомузыку';

    INTERFACE.data.someOutput = data.readUInt8(0);

    //redraw user interface
    API.onInfrastructureUpdateInfo(API_UUID, INTERFACE.data);
    API.onInfrastructureRedrawPalette(API_UUID);

    return true;
    
};

INTERFACE.initSocket = function(socket){

    socket.on('set mode', function(data){
        INTERFACE.data.mode = data;
        
        changedMode = true;
    });
    
    return true;
};

var InterfaceInited = false;

INTERFACE.initOnce = function(noble, socket){
    if(InterfaceInited) return;
    InterfaceInited = true;
    
    var res = this.init(noble, socket);
    
    if(res)
        console.log('INTERFACE inited successfully');
    else
        console.log('INTERFACE have failed during the initialization');
    
    return res;
}

var changedMode = false;

INTERFACE.START_ES_LOOP = function(){
    
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
    var out_magnitude, out_color, old_out_color, out_fade; //выходные параметры
    var is_hit; //признак удара
    var four_min=0, four_max=0, four_min_value, four_max_value;
    var i,j;

    /* настраиваемые параметры */

    var magnitude_param = [4, 3, 3, 3];
    var magnitude_param_min = [4, 3, 3, 3];
    var magnitude_param_many_multiplier = [0.2, 0.1, 0.07, 0.07];//умножается на разницу текущего и среднего числа удраров
    var magnitude_param_little_multiplier = [0.7, 0.4, 0.4, 0.3];//вычитается статично //pitbul - 0.6
    var magnitude_param_D_multiplier = [0.04, 0.06, 0.06, 0.02];//умножается на разницу текущего и среднего числа ударов и накапливается //pitbul -0.03
    //настройки числа ударов по частотным областям
    var hits_per_second_min = [1,1,0,1];//1 1 0 1
    var hits_per_second_max = [5,5,0,3];//5 2 0 3
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

    var oldNum=0,
    oldLightness = 0;


    // Будем вызывать функцию анализа спектра через каждые 15 мс
    setInterval(periodicFFT,100);
    function periodicFFT() {
        
        if(INTERFACE.data.mode == 0){

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
                if ((rebuild_counter[stable_choice]>7) || (stable_counter[stable_choice] > 10000)){
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
                old_out_color = out_color;

                //исходное значение four_both_weighed[stable_choice].y примерно от 0 до 8
                out_magnitude = (four_both_weighed[stable_choice].y - 1)/7*100;
                //pwm3.write(out_magnitude);

                out_color = four_both_weighed[stable_choice].y;

                //console.log("sum: " + sum + " out_color: " + out_color);
                out_color = (out_color*(sum - 5)/20/8*90);
                //console.log(" out_color: " + out_color);
                out_color = out_color + 90*stable_choice;

                if (hits_per_second[stable_choice]>0) out_fade = 1/hits_per_second[stable_choice]*1000;
                else out_fade = 1000;
                //console.log("hits_per_second[stable_choice]: " + hits_per_second[stable_choice] + " out_fade: " + out_fade);

                //здесь запускать функцию удара
                //console.log(out_fade);
                if (out_color - old_out_color > 7) hit(out_color,out_magnitude,out_fade);
                is_hit = false;
            }
            else{
                //pwm3.write(0);
            }
            
        }else{
            
            if(!changedMode) return;
            
            changedMode = true;
            
            red.write(Math.random());
            green.write(Math.random());
            blue.write(Math.random());
        }

        //myOnboardLed.write(is_hit?1:0);
    }

    //Тест функции hit вручную
    //setInterval(function(){
    //hit(Math.random()*360, 100,1000);},2000); 

    //визуализирует удар 0..360, 0..100, time for fade-out
    function hit(nNum,nLightness,tFall){
    var difference=((nNum-oldNum)/50),
    lightnessDif = (nLightness - oldLightness)/50;
    //За 20 итераций плавно приходим по цвету к новому - nNumп приблизительно

    var counter1 = 0;
	
	var Interval2 = 0;

    var interval1 = setInterval (function (){
		
		if(Interval2 !== 0){
			clearInterval(Interval2);
			Interval2 = 0;
		}
		
        counter1++;
        curLightness = oldLightness;
        hitRgb = ConvertRangeToRGB(oldNum, Math.round(oldLightness));
        oldNum = oldNum+difference;
        oldLightness = oldLightness + lightnessDif;
        red.write(hitRgb[0]/255);
        green.write(hitRgb[1]/255);
        blue.write(hitRgb[2]/255);
        //console.log('color:', hitRgb,'Lightness',Math.round(oldLightness) );

        if(counter1 > 50){

            clearInterval(interval1);
            oldNum = nNum;

            Interval2 = setInterval(function () {
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
    },2);
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
    
};

module.exports = INTERFACE;