var IoT_API = function(){
    
    //!!!initialization
    this.clients = []; //[1: jabs_labs, 2: DICH, 3: ...]

    this.callbacks = {}; //{1 /*='jabs_labs'*/: {'__data': {...}, 'drawHTML': function /*функция отвечает за отрисовку, возвращает HTML*/}, .., ...]

    /*SERVER FUNCTION which is called when infrastructure */
    this.socketRefreshHTMLEmitCallback = function(infrastructureUUID, html){return true;};//function(infrastructureUUID){/*socket.emit('redrawInfrastructureHTML', {'infrastructureUUID': infrastructureUUID, 'html': this.})*/}
    this.socketRefreshDataEmitCallback = function(infrastructureUUID, data){return true;/*server creates a socket and sends all the updates object to a server*/};
    
    
    
    /*FUNCTIONS FOR INFTRASTRUCTURES*/
    
    /*Registers Infrastracture */
    this.registerInfrastructure = function(infrastructureName/*int*/, baseInfo){
        var new_uuid = this.clients.push(infrastructureName);

        this.callbacks[new_uuid] = {'drawHTML': function(){return '';}, '__data': {}};

        return new_uuid;
    };
    
    /*Calls by Infrastructure to register function, which is called when user asks for global HTML page
    * CALLBACK RETURN: Should return complete HTML code to be drawn in HTML palette
    * RETURN: true*/
    this.registerDrawHTMLCallback = function(infrastructureUUID/*int*/, callback){
        this.callbacks[infrastructureUUID].drawHTML = callback;
        
        /**/
        
        return true;
    };
    
    this.registerNobleServiceUUID = function(infrastructureUUID, nobleUUID){
        this.callbacks[infrastructureUUID].nobleServiceUUID = nobleUUID;
        
        return true;
    };
    
    /*called BY INFRASTRUCTURE to store into API (over here) some system information (when some information over infrastructure was updated)*/
    this.onInfrastructureUpdateInfo = function(infrastructureUUID/*int*/, info/*object*/) {
        if(!this.socketRefreshEmitCallback || typeof this.socketRefreshEmitCallback !== 'function')
            return false;

        this.callbacks[infrastructureUUID].__data = info;

        return this.socketRefreshDataEmitCallback.call(infrastructureUUID, info);
    };
    
    /*called BY INFRASTRUCTURE when users' pages should be redrawn (using sockets) (when some information over infrastructure was updated) */
    this.onInfrastructureRedrawPalette = function(infrastructureUUID/*int*/){
        if(!this.socketRefreshEmitCallback || typeof this.socketRefreshEmitCallback !== 'function')
            return false;
        
        var html = this.infrastructureDrawPalette(infrastructureUUID);
        
        return this.socketRefreshHTMLEmitCallback.call(infrastructureUUID, html);
    };
    
    
    /*FUNCTIONS FOR SERVER*/
    
    this.initializeSocketRefreshHTMLEmitCallback = function(callback){
        this.socketRefreshHTMLEmitCallback = callback;
    };

    this.initializeSocketRefreshDataEmitCallback = function(callback){
        this.socketRefreshDataEmitCallback = callback;
    };

    this.infrastructureDrawPalette = function(infrastructureUUID){ /*RETURNS A HTML OF DRAWN HTML PALETTE WITH UUID `infrastructureUUID`*/
        return this.callbacks[infrastructureUUID].drawHTML.call();
    };

    this.infrastructuresDrawPalettes = function(){ /*RETURNS AN ARRAY OF DRAWN HTML PALETTES*/
        var stack = [];
        
        var keys = Object.keys(this.clients);
        
        if(keys.length > 0)
            for(var i = 0; i < keys.length; i++)
                stack.push(this.infrastructureDrawPalette(keys[i]));
        
        return stack;
    };
    
    return this;
    
};

module.exports = /*new */IoT_API();