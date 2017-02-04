/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */

var express = require('express');
var app = express();
var path = require('path');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var noble = require('noble');

console.log();

//var INTERFACE = require(path.resolve(path.dirname(require.main.filename), 'externals/BLINCHIKI.js')); /*ИНИЦИАЛИЗИРУЕМ НАШ external_interface.js*/

var INTERFACE = [];

INTERFACE.push(require(path.resolve(path.dirname(require.main.filename), 'externals/DICH_INTELFACE.js')));
INTERFACE.push(require(path.resolve(path.dirname(require.main.filename), 'externals/BLINCHIKI.js')));
INTERFACE.push(require(path.resolve(path.dirname(require.main.filename), 'externals/POLYTOPE.js')));

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
    
    for(var i= 0; i < INTERFACE.length; i++)
        if('initSocket' in INTERFACE[i])
            INTERFACE[i].initSocket(socket);

   /* INTERFACE.emitSocket = function(sock, data){ //ОБЯЗАТЕЛЬНО ОБЪЯВИТЬ ЭТОТ CALLBACK для обратной связи между external_interface.js и этим файлом (socket.io)
                                                 //пример вызова смотреть в external_interface.js
        console.log(sock, data);
        io.emit(sock, data);
    };*/
    
});

INTERFACE.emitSocket = function(sock, data){ //ОБЯЗАТЕЛЬНО ОБЪЯВИТЬ ЭТОТ CALLBACK для обратной связи между external_interface.js и этим файлом (socket.io)
                                                 //пример вызова смотреть в external_interface.js
        console.log(sock, data);
        io.emit(sock, data);
};

//Noble BLE Interface initialization
noble.on('stateChange', function(state){

    if(state === 'poweredOn'){
        console.log('[BLE] powered ON successfully!');
        setInterval(function(){
            console.log('[BLE] is idle... scanning... ', INTERFACE.coordServiceUuid);
            noble.startScanning(/*[INTERFACE.coordServiceUuid]*/[], true);

            //INTERFACE.initOnce(noble); //WE DO CALL that function only over here, after noble.startScanning() because it depends on "noble" variable
            
            for(var i= 0; i < INTERFACE.length; i++)
                if('initOnce' in INTERFACE[i])
                    INTERFACE[i].initOnce(noble);
            
        }, 2000);
    }else
        noble.stopScanning();
    
});

if('START_ES_LOOP' in INTERFACE[0])
    INTERFACE[0].START_ES_LOOP();

var HTTP_PORT = Math.round(Math.random()*10000);
http.listen(HTTP_PORT, function(){
    console.log('Web server Active listening on *:', HTTP_PORT);
});