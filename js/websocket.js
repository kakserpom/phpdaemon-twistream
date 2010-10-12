if ('undefined' == typeof(console)) {
	// emulating console object to avoid errors
	console = {
		  log : function(msg) { },
		error : function(msg) { }
	}
}

WebSocketConnection = function(settings) {
	
	this.settings = settings || [];
	
	/**
	 * Initialization
	 */
	this.init = function() {
		if ('doInit' in this) {
			this.doInit();
		}
	
		if ('onReady' in this.settings) {
			this.settings.onReady();
		}
	}
	
	/**
	 * Close the connection
	 */
	this.close = function() {

	}
	
	/**
	 * Send data to the server
	 */
	this.send = function(data) {

	}
	
// ---------------------------------------------------------
	
	/**
	 * Check the settings
	 */
	var checkSettings = function(s) {
		if (!('url' in s)) {
			console.error('url is not defined in settings');
			return false;
		}
		
		s['jspath'] = s['jspath'] || '/js/';
		
		return true;
	}
	
	/**
	 * Check the connection type and initialize provider
	 */
	var initProviders = function(jspath, callback) {
		if ('WebSocket' in window) {
			// native WebSocket found
			$.getScript(jspath + 'websocket_native.js', callback);
			return;
		}
		
		// @todo check flash
	}
	
	if (!checkSettings(this.settings)) {
		return false;
	}

	var self = this;
	
	initProviders(this.settings['jspath'], function() {
		self.init();
	});

}
