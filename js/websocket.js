// emulating console object to avoid errors in nedobrowsers
if ('undefined' == typeof(console)) {
	console = {
		  log : function(msg) { },
		error : function(msg) { },
		 warn : function(msg) { }
	}
}

/**
 * WebSocket connection object
 *
 * You can set the settings via constructor argument
 *
 * var ws = new WebSocketConnection( {
 *   jspath: '/javascript/',                    path to your javascript directory from the web (default value is "/js/")
 *
 *   url: {                                     urls list object, you can use string as value to set all variants
 *                                              also you can set urls to methods you allowed, other will not be used
 *
 *     websocket: 'ws://test/test'              - websocket connection url
 *   },
 *                                              events handlers (all handlers can be assigned to object manually):
 *
 *   onReady        = function() { },           - connection object is ready for use
 *   onConnected    = function() { },           - connected to server
 *   onDisconnected = function() { },           - disconnected
 *   onMessage      = function(message) { },    - new message from server received
 *   onError        = function(error) { },      - error
 * } );
 *
 *                                              object methods:
 *
 * if (ws.isConnected()) {                      - returns true if connection to server is opened
 *   ws.send(somedata);                         - send [somedata] to server
 *   ws.close();                                - close the connection
 * }
 *
 */
WebSocketConnection = function() {
	
	var provider = null;	
	var self = this;
	var packetQueue = [];
	
// ---------------------------------------------------------
// Public event handlers
// ---------------------------------------------------------	

	this.onReady        = function()        { };
	this.onError        = function(error)   { };
	this.onMessage      = function(message) { };
	this.onConnected    = function()        { };
	this.onDisconnected = function()        { };
	
// ---------------------------------------------------------
// Public methods
// ---------------------------------------------------------	
	
	/**
	 * Close the connection
	 */
	this.close = function() {
		provider.close();
	}
	
	/**
	 * Send data to the server
	 */
	this.send = function(data) {
		// checking the connection
		if (!this.isConnected()) {
			// queueing data item to send it later 
			// @todo add option to disable queueing in settings
			packetQueue.push(data);
			
			return false;
		}
	
		provider.send(data);
		
		return true;
	}
	
	this.isConnected = function() {
		return (
			provider
			&& provider.OPEN === provider.readyState
		);
	}
	
// ---------------------------------------------------------
// Provider event handlers
// ---------------------------------------------------------	

	// connection is opened
	var onProviderOpen = function() {
		self.onConnected();
		
		// check for queue to send it
		var success = true;
		
		while (
			success
			&& packetQueue.length > 0
		) {
			// break if first time is not successful
			success = self.send(packetQueue.shift());
		}
	}
	
	// connection is closed
	var onProviderClose = function() {
		self.onDisconnected();
	}
	
	// new message received
	var onProviderMessage = function(message) {
		self.onMessage(message);
	}
	
	// error ;(
	var onProviderError = function(error) {
		self.onError(error);
	}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------		
	
	var initProvider = function(url) {
		if ('undefined' === typeof(WebSocketProvider)) {
			self.onError({
				description: 'No provider is defined',
				err: 1
			});

			return false;
		}

		// creating provider object
		try {
			provider = new WebSocketProvider(url);
		} catch (e) {
			self.onError(e);

			return false;
		}

		// assigning handler functions
		provider.onopen    = onProviderOpen;
		provider.onmessage = onProviderMessage;
		provider.onclose   = onProviderClose;
		
		provider.onerror   = self.onError;
		
		// firing onReady event
		self.onReady();

		return true;
	}

// ---------------------------------------------------------
// Check settings
// ---------------------------------------------------------
	
	var settings = arguments[0] || { };	
	
	// Checking the settings
	if (!('url' in settings)) {
		console.error('url is not defined in settings');
		return false;
	}
	
	// @todo check for string in 'url' value to assign every provider with it
		
	// checking jspath, default is "/js/"
	settings['jspath'] = settings['jspath'] || '/js/';
	
	// Overriding event handlers from settings
	// @todo maybe there is a better way to do this?
	for (var key in settings) {
		if (
			key.length > 1
			// onXXXX ?
			&& key.substring(0, 2) === 'on'
			// do we have this public method?
			&& key in this
		) {
			// overriding
			this[key] = settings[key];
		}
	}

// ---------------------------------------------------------
// Let's go
// ---------------------------------------------------------	
	
	var result = false;
	
	// Check the connection type and initialize provider
	if (
		'WebSocket' in window
		// only if settings.url.websocket is defined
		&& 'websocket' in settings['url']
	) {
		// native WebSocket found
		WebSocketProvider = WebSocket;
		result = initProvider(settings['url']['websocket']);
	}
	
	if (!result) {
		// Building WebSocketProvider skeleton similar to WebSocket
		WebSocketProvider = function(url) { 
			this.URL = url;
			this.bufferedAmount = 0;
			this.readyState = 2;
		};
		
		// default constants
		WebSocketProvider.prototype.CONNECTING = 0;
		WebSocketProvider.prototype.OPEN       = 1;
		WebSocketProvider.prototype.CLOSED     = 2;
		
		// event handlers
		WebSocketProvider.prototype.onopen    = function() { };
		WebSocketProvider.prototype.onmessage = function() { };
		WebSocketProvider.prototype.onclose   = function() { };
		WebSocketProvider.prototype.onerror   = function() { };

		// providers have to override these methods:
		WebSocketProvider.prototype.close     = function()     { };
		WebSocketProvider.prototype.send      = function(data) { };
	}
	
	// @todo check other providers

	return result;
}

/**
 * Data encoder for WebSocket
 */
function WebSocketEncodeData(data) {
	var query = [];
	
	if (data instanceof Object) {
		for (var k in data) {
			query.push(encodeURIComponent(k) + '=' + encodeURIComponent(data[k]));
		}
		
		return query.join('&');
	} else {
		return encodeURIComponent(data);
	}
}
