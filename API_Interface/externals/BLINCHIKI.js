var path = require('path');

var API = require(path.resolve(path.dirname(require.main.filename), 'externals/iot.api.js')); //рекварим нашу api-библиотеку ОБЩЕГО сервера
var INTERFACE = {}; //тут мы будет описывать всё, что на экспорт

var API_UUID = API.registerInfrastructure('BLINCHIKI', {}); // регаемся в нашей API-библиотеке и получаем уникальный ID, 
                                                                 // с которым мы потом всё время к ней обращаемся

INTERFACE.coordServiceUuid = '19b10012e8f2537e4f6cd104768a1214'; //coordServiceUuid нашего bluetooth на Genuino
var coordCharUUIDs = ['19b10012e8f2537e4f6cd104768a1216',//номер упражнения
                      '19b10013e8f2537e4f6cd104768a1217',//кол-во очков
                      '19b10014e8f2537e4f6cd104768a1218']; //кол-во подъёмов

API.registerNobleServiceUUID(API_UUID, INTERFACE.coordServiceUuid); // наш coordServiceUuid ОБЯЗАТЕЛЬНО! нужно сообщить API
                                                                    //ВНИМАНИЕ! ОСОБЕННО АКТУАЛЬНО ДЛЯ КОМАНДЫ PolyTop!!!
                                                                    //В ФУНКЦИЮ API.registerNobleServiceUUID МОЖНО ПЕРЕДАВАТЬ КАК ОДИН (string)UUID (если он один)
                                                                    //ТАК И МАССИВ ИЗ [(string)UUID, ...] (если их несколько)!!!!!!!!!!!!

INTERFACE.data = {}; //этот объект будет передаваться API при динамическом обновлении данных

INTERFACE.data.status = 'Нет упражнения'; 
INTERFACE.data.cur_mode = -1; 
INTERFACE.data.someOutput = 0;

INTERFACE.data.scores = [0, 0]; /*first ex., second ex.*/
INTERFACE.data.tilts = [0, 0]; /*first ex., second ex.*/

API.registerDrawHTMLCallback(API_UUID, function(){ // функция, отвечающая за отрисовку html-кода в блок на странице

    //тут мы можем отрисовывать ЧТО хотим и КАК хотим. стандартные поля типа INTERFACE.data.status обрабатываются другими методами (API делает это автоматически, их тут трогать не нужно)
    
    var html = '';

    //html += '<b>СТАТУС:</b> ' + INTERFACE.data.status + "<br>\n"; // ЭТО НЕ НУЖНО!
    html += '<b>Вывод:</b> ' + (INTERFACE.data.someOutput == 0?'<i>пока ещё не было</i>':INTERFACE.someOutput);

    return html; //возвращаем в код!

});

INTERFACE.emitSocket = function(sock, data){return true;}; //эта функция объявляется на Вашем сервере, когда нужно затригать сокет клиенту 

INTERFACE.init = function(noble){ //this function contains all the main functionality

    //BLE onDiscover should be described over here
    noble.on('discover', function(peripheral) {
       // noble.stopScanning();
        
        peripheral.connect(function(error) {
            console.log('connected to peripheral: ' + peripheral.uuid);
            peripheral.discoverServices([/*INTERFACE.coordServiceUuid*/], function(error, services) {
                
                
                services.forEach(function(service) { //SOME additional check for service to be valid. you may use simply "var service = services[0];"
                console.log(peripheral.uuid, service.uuid);
                    console.log('found service:', service.uuid);

                    service.discoverCharacteristics(coordCharUUIDs, function (error, characteristics) {
                        if(characteristics.length == 0) return;
                        
                        for(var i = 0; i < characteristics.length; i++){

                            var characteristic = characteristics[i];
                            
                            characteristic.on('read', function (data, isNotification) {
                                
                                switch(characteristic.uuid){
                                    case coordCharUUIDs[0]: //gen tells us excercise identificator
                                        var mode = data.readUInt8(0); //
                                        
                                        if(mode <1 || mode > 2) return; //ERROR!

                                        INTERFACE.data.status = (mode == 1? 'Изолированное сгибание': 'Вертикальная тяга'/*2*/);
                                        INTERFACE.data.cur_mode = mode;
                                        
                                        break;
                                    case coordCharUUIDs[1]: //score count
                                        if(INTERFACE.data.cur_mode < 1 || INTERFACE.data.cur_mode > 2) return; //error!
                                        
                                        var s_data = data.readUInt8(0); //
                                        
                                        INTERFACE.data.scores[INTERFACE.data.cur_mode-1] += s_data;
                                        
                                        break;
                                    case coordCharUUIDs[2]: //tilt count
                                        if(INTERFACE.data.cur_mode < 1 || INTERFACE.data.cur_mode > 2) return; //error!
                                        
                                        var t_data = data.readUInt8(0); //
                                        
                                        INTERFACE.data.tilts[INTERFACE.data.cur_mode-1] += t_data;
                                        break;
                                }

                                //logging to console
                                console.log('[BLE] captured some info');

                                //redraw user interface
                                API.onInfrastructureUpdateInfo(API_UUID, INTERFACE.data);
                                
                                //if('emitSocket' in INTERFACE && typeof INTERFACE.emitSocket == 'function') //ЕСЛИ эта функция уже была инициализирована, то вызываем её
                                INTERFACE.emitSocket.call('blinchiki', INTERFACE.data);
                            });

                            // true to enable notify
                            characteristic.notify(true, function (error) {
                                console.log('[BLE] some notification is on');
                                INTERFACE.data.status = 'подключились к genuino';

                                API.onInfrastructureUpdateInfo(API_UUID, INTERFACE.data);

                                API.onInfrastructureRedrawPalette(API_UUID); // говорим API, что блок нужно перерисовать у пользователя

                                //if('emitSocket' in INTERFACE && typeof INTERFACE.emitSocket == 'function')
                                INTERFACE.emitSocket.call('client update html', INTERFACE.data);
                            });

                        }
                    });
                });
            });
        });
    });

    /*init noble*/
    
    
    return true;
    
};

var InterfaceInited = false;

INTERFACE.initOnce = function(noble){
    if(InterfaceInited) return;
    InterfaceInited = true;
    
    var res = this.init(noble);
    
    if(res)
        console.log('INTERFACE inited successfully');
    else
        console.log('INTERFACE have failed during the initialization');
    
    return res;
}

module.exports = INTERFACE;