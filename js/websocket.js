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
	var state = WebSocketConnection.CLOSED;
	
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
		this.provider.close();
	}
	
	/**
	 * Send data to the server
	 */
	this.send = function(data) {
		this.provider.send(data);
	}
	
	this.connected = function() {
		return state === WebSocketConnection.OPEN;
	}
	
// ---------------------------------------------------------
// Provider event handlers
// ---------------------------------------------------------	

	var onProviderOpen = function() {
		state = WebSocketConnection.OPEN;
	}
	
	var onProviderClose = function() {
		state = WebSocketConnection.CLOSED;
	}
	
	var onProviderMessage = function(message) {
		self.onMessage(message);
	}
	
	var onProviderError = function(error) {
	
	}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------		
	
	var initProvider = function(url) {
		try {
			provider = new WebSocketProvider(url);
		} catch (e) {
			console.error(e.message);
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
		// @todo check flash
	}

	return result;
}

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------
	
WebSocketConnection.CLOSED     = 0;
WebSocketConnection.CONNECTING = 1;
WebSocketConnection.OPEN       = 2;