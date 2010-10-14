if ('undefined' == typeof(console)) {
	// emulating console object to avoid errors
	console = {
		  log : function(msg) { },
		error : function(msg) { },
		 warn : function(msg) { }
	}
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

WebSocketConnection = function() {
	
	var provider = null;	
	var self = this;
	
// ---------------------------------------------------------
// Public event handlers
// ---------------------------------------------------------	

	this.onReady        = function() { };
	this.onError        = function(error) { };
	this.onMessage      = function(message) { };
	this.onConnected    = function() { };
	this.onDisconnected = function() { };
	
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
		provider.send(data);
	}
	
	this.connected = function() {
		return (
			provider
			&& provider.OPEN === provider.readyState
		);
	}
	
// ---------------------------------------------------------
// Provider event handlers
// ---------------------------------------------------------	

	var onProviderOpen = function() {	
		self.onConnected();
	}
	
	var onProviderClose = function() {
		self.onDisconnected();
	}
	
	var onProviderMessage = function(message) {
		self.onMessage(message);
	}
	
	var onProviderError = function(error) {
		self.onError(error);
	}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------		
	
	var initProvider = function(url) {
		if ('undefined' === typeof(WebSocketProvider)) {
			self.onError({
				description: 'No provider defined',
				err: 1
			});

			return false;
		}

		try {
			provider = new WebSocketProvider(url);
		} catch (e) {
			self.onError(e);

			return false;
		}

		provider.onopen    = onProviderOpen;
		provider.onmessage = onProviderMessage;
		provider.onclose   = onProviderClose;
		
		provider.onerror   = self.onError;
		
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
		
	settings['jspath'] = settings['jspath'] || '/js/';
	
	// Overriding event handlers from settings
	// @todo maybe there is a better way to do this?
	for (var key in settings) {
		if (
			key.length > 1
			&& key.substring(0, 2) === 'on'
			&& key in this
		) {
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
		&& 'websocket' in settings['url']
	) {
		// native WebSocket found
		WebSocketProvider = WebSocket;
		result = initProvider(settings['url']['websocket']);
	}
	
	if (!result) {
		// Building WebSocket skeleton
		WebSocketProvider = function(url) { 
			this.URL = url;
			this.bufferedAmount = 0;
			this.readyState = 2;
		};
		
		WebSocketProvider.prototype.CONNECTING = 0;
		WebSocketProvider.prototype.OPEN       = 1;
		WebSocketProvider.prototype.CLOSED     = 2;
		
		WebSocketProvider.prototype.onopen    = function() {};
		WebSocketProvider.prototype.onmessage = function() {};
		WebSocketProvider.prototype.onclose   = function() {};
		WebSocketProvider.prototype.onerror   = function() {};

		WebSocketProvider.prototype.close     = function() {};
		WebSocketProvider.prototype.send      = function(data) {};
		
		// @todo check flash
		result = initProvider(settings['url']['websocket']);
	}

	return result;
}
