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

WebSocketConnection = function(settings) {
	
	var settings = settings || [];
	var provider = null;	
	var self = this;
	
// ---------------------------------------------------------
// Public event handlers
// ---------------------------------------------------------	

	this.onReady = function() { };
	
// ---------------------------------------------------------
// Public methods
// ---------------------------------------------------------	
	
	/**
	 * Close the connection
	 */
	this.close = function() {
		if (this.provider) {
			this.provider.close();
		}
	}
	
	/**
	 * Send data to the server
	 */
	this.send = function(data) {
		if (this.provider) {
			this.provider.send(data);
		}
	}	
	
// ---------------------------------------------------------
// Provider event handlers
// ---------------------------------------------------------	

	var onProviderOpen = function() {
	
	}
	
	var onProviderClose = function() {
	
	}
	
	var onProviderMessage = function(message) {
	
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
		provider.onerror   = onProviderError;
		
		self.onReady();

		return true;
	}

// ---------------------------------------------------------
// Check settings
// ---------------------------------------------------------
	
	// Checking the settings
	if (!('url' in settings)) {
		console.error('url is not defined in settings');
		return false;
	}
		
	settings['jspath'] = settings['jspath'] || '/js/';
	
	if ('onReady' in settings) {
		this.onReady = settings.onReady;
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
