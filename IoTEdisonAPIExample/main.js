/*
* Пример приложения для Edison на JavaScript (Intel XDK, node.js 7.4.0, ECMASctipt6)
* На данном примере продемонстрирован базовый функционал сервера для Edison в рамках рассматриваемых задач
*   для разрабатываемых устройств на Winter Alumni BootCamp 2017 
*   (подключение к Genuino по BLE, веб-сервер на Express, взаимодействие с API общего интерфейса)
* В примере описан метод "слива" необходимой информации о состоянии устройства IoT на ОБЩИЙ интерфейс, 
*   а так же отрисовка пользовательских данных (на чистом HTML) на ОБЩИЙ интерфейс.
*   
* Данный пример в принципе можно запустить на Edison (в связке Edison-Genuino), изолированном от "внешнего мира".
* Концепт API предполагает, что весь его (данного сервера) основной функционал ДОЛЖЕН лежать в файле external_interface.js 
*   (некий внешний модуль, который рекварится в нужном месте, и исполняется, см. данный пример) для обеспечения его мобильности 
*   (если переносить функционал данного изолированного сервера на ОБЩИЙ сервер - это нужно для того, чтобы
*   не переносить тонну лишнего кода, который фактически у всех серверов одинаковый и дублируется, 
*   примеры - см. ниже, а перенести на ОБЩИЙ сервер лишь по одному файлу-внешней библиотеке от каждой команды - external_interface.js)
* Веб-сервер (express) описывается каждой командой чисто-для себя, и к ОБЩЕМУ интерфейсу не имеет никакого отношения 
*   (сам express НЕ должен быть описан в файле external_interface.js ).
* Что касается BLE, то поиск своего Genuino-устройства ( метод noble.on('stateChange', ...) ) должен быть описан там же, где и express, точнее,
*   где угодно, только не в external_interface.js, а вот noble.on('discover', ...) должен быть описан уже внутри external_interface.js .
*   Так же во внешней библиотеке external_interface.js описывается Ваш coordServiceUuid (уникальный id Вашего bluetooth-сервиса на Genuino).
* Касательно socket.io , все события данной библиотеки описываются там же, где и express (НЕ в external_interface.js)
*   (всё необходимое дублируется в файле external_interface.js).
*   
* ОБРАТИТЕ ВНИМАНИЕ НА РАБОТУ С ВНЕШНЕЙ БИБЛИОТЕКОЙ iot.api.js (на примере external_interface.js)!!!!
* !!! Пока Вы со своей командой отлаживаете свой веб-интерфейс на Edison, методы, которые Вы вызываете из библиотеки iot.api.js 
*   НЕ несут никакой смысловой нагрузки. Они "просто есть". Они фактически нужны только тогда, когда Ваша внешняя библиотека
*   заливается на ОБЩИЙ сервер, который не знает ничего про код, оставшийся за её пределами (описание express, ...).
*   
* IMPORTANT: Не забывайте, что весь код, который будет у Вас описан в external_interface.js будет выполняться на Edison, соответственно,
*   это даёт возможность использовать вычислительные возможности ОБЩЕГО сервера (что существенно привышает ограничения на Genuino),
*   если это, конечно, необходимо. 
*   
* ATTENTION: вместе с файлом external_interface.js на ОБЩИЙ сервер так же можно перенести папку с какими-то внешними файлами.
*   Для этого, когда Вы кидаете её в гит, Вы также сообщаете команде, которая разрабатывает общий сервер, куда эту папку нужно положить на ОБЩЕМ сервере.
*   Абсолютный путь к папке со статичными файлами на ОБЩЕМ сервере, а так же к корню ОБЩЕГО сервера вытягивается специальными функциями из библиотеки iot.api.js (см. пример) . 
*   
* SUMMARY: согласен, система не оч изи, и маленечко оставляет желать лучшего, но это самое адекватное, что я смог придумать, ибо
*   нам очень лень копаться в чужом коде + удобно обновлять все внесённые Вами изменения - всё важное у Вас лежит в одном файле, который
*   оч просто перезаливается в гит (:super:).
* */

/* 
* FILE LIST:
* 
* ./main.js - точка входа в приложение
* ./iot.api.js - внешняя api-библиотека ОБЩЕГО сервера
* ./external_interface.js - внешняя библиотека команды
* 
 */

/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var noble = require('noble');

var INTERFACE = require('./external_interface'); /*ИНИЦИАЛИЗИРУЕМ НАШ external_interface.js*/

var connectedUsersArray = [];
var userId;

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/client', 'index.html'));
});

//Allow use of files in client folder
app.use(express.static(__dirname + '/client'));
app.use('/client', express.static(__dirname + '/client'));

//Socket.io Event handlers
io.on('connection', function(socket) {
    console.log("\n Add new User: u"+connectedUsersArray.length);
    if(connectedUsersArray.length > 0) {
        var element = connectedUsersArray[connectedUsersArray.length-1];
        userId = 'u' + (parseInt(element.replace("u", ""))+1);
    }
    else {
        userId = "u0";
    }
    console.log('a user connected: '+userId);
    io.emit('user connect', userId);
    connectedUsersArray.push(userId);
    console.log('Number of Users Connected ' + connectedUsersArray.length);
    console.log('User(s) Connected: ' + connectedUsersArray);
    io.emit('connected users', connectedUsersArray);
    
    socket.on('user disconnect', function(msg) {
        console.log('remove: ' + msg);
        connectedUsersArray.splice(connectedUsersArray.lastIndexOf(msg), 1);
        io.emit('user disconnect', msg);
    });
    
    socket.on('chat message', function(msg) {
        io.emit('chat message', msg);
        console.log('message: ' + msg.value);
    });
    
    socket.on('toogle led', function(msg) {
        myOnboardLed.write(ledState?1:0); //if ledState is true then write a '1' (high) otherwise write a '0' (low)
        msg.value = ledState;
        io.emit('toogle led', msg);
        ledState = !ledState; //invert the ledState
    });

    INTERFACE.emitSocket = function(sock, data){ //ОБЯЗАТЕЛЬНО ОБЪЯВИТЬ ЭТОТ CALLBACK для обратной связи между external_interface.js и этим файлом (socket.io)
                                                 //пример вызова смотреть в external_interface.js
        console.log('WE EMIT A SOCKET!');
        io.emit(sock, data);
    };
    
});

//Noble BLE Interface initialization
noble.on('stateChange', function(state){

    if(state === 'poweredOn'){
        console.log('[BLE] powered ON successfully!');
        setInterval(function(){
            console.log('[BLE] is idle... scanning...');
            noble.startScanning([INTERFACE.coordServiceUuid], true);

            INTERFACE.initOnce(noble); //WE DO CALL that function only over here, after noble.startScanning() because it depends on "noble" variable
        }, 2000);
    }else
        noble.stopScanning();
    
});

var HTTP_PORT = Math.round(Math.random()*10000);
http.listen(HTTP_PORT, function(){
    console.log('Web server Active listening on *:', HTTP_PORT);
});