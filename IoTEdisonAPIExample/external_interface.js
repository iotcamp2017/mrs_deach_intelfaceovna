var API = require('./iot.api.js'); //рекварим нашу api-библиотеку ОБЩЕГО сервера
var INTERFACE = {}; //тут мы будет описывать всё, что на экспорт

var API_UUID = API.registerInfrastructure('DICH IntelFace', {}); // регаемся в нашей API-библиотеке и получаем уникальный ID, 
                                                                 // с которым мы потом всё время к ней обращаемся

INTERFACE.coordServiceUuid = '00000000000000000000000000000001'; //coordServiceUuid нашего bluetooth на Genuino
var coordCharUUID = '00000000000000000000000000000001'; //uuid характеристик можно хранить как угодно, они не нужны для API, т.к. их затрагивает ТОЛЬКО код из этого файла

API.registerNobleServiceUUID(API_UUID, INTERFACE.coordServiceUuid); // наш coordServiceUuid ОБЯЗАТЕЛЬНО! нужно сообщить API
                                                                    //ВНИМАНИЕ! ОСОБЕННО АКТУАЛЬНО ДЛЯ КОМАНДЫ PolyTop!!!
                                                                    //В ФУНКЦИЮ API.registerNobleServiceUUID МОЖНО ПЕРЕДАВАТЬ КАК ОДИН (string)UUID (если он один)
                                                                    //ТАК И МАССИВ ИЗ [(string)UUID, ...] (если их несколько)!!!!!!!!!!!!

INTERFACE.data = {}; //этот объект будет передаваться API при динамическом обновлении данных

INTERFACE.data.status = 'Всё ок:)'; 
INTERFACE.data.someOutput = 0;

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
            peripheral.discoverServices([INTERFACE.coordServiceUuid], function(error, services) {
                services.forEach(function(service) { //SOME additional check for service to be valid. you may use simply "var service = services[0];"
                    console.log('found service:', service.uuid);

                    service.discoverCharacteristics([coordCharUUID/*HERE IS SOME characteristics IDs, they are setup by yourself and it's doesn't matter to a SHARED server*/], function (error, characteristics) {
                        var characteristic = characteristics[0];
                        console.log('discovered [some] characteristic');

                        characteristic.on('read', function (data, isNotification) {
                            INTERFACE.data.status = 'только что прочитали инфу';
                            
                            //logging to console
                            console.log('[BLE] some integer captured: ', data.readUInt8(0));

                            INTERFACE.data.someOutput = data.readUInt8(0);
                            
                            //redraw user interface
                            API.onInfrastructureUpdateInfo(API_UUID, INTERFACE.data); //дання функция обрабатывает одновление стандартного поля типа INTERFACE.data.status
                                                                                      //без полной перерисовки (в отличие от функции API.onInfrastructureRedrawPalette, которая выполняет ПОЛНУЮ перерисовку всей информации в формате html, расположенной ПОД стандартными полями) 
                            
                            API.onInfrastructureRedrawPalette(API_UUID); // говорим API, что блок нужно перерисовать у пользователя

                            //if('emitSocket' in INTERFACE && typeof INTERFACE.emitSocket == 'function') //ЕСЛИ эта функция уже была инициализирована, то вызываем её
                            INTERFACE.emitSocket.call('client update html', INTERFACE.data);
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