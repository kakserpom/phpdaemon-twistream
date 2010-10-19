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
 * if (ws.connected()) {                      - returns true if connection to server is opened
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

	self.onReady        = function()        { };
	self.onError        = function(error)   { };
	self.onMessage      = function(message) { };
	self.onConnected    = function()        { };
	self.onDisconnected = function()        { };

// ---------------------------------------------------------
// Public methods
// ---------------------------------------------------------

	/**
	 * Close the connection
	 */
	self.close = function() {
		provider.close();
	}

	/**
	 * Send data to the server
	 */
	self.send = function(data) {
		// checking the connection
		if (!self.connected()) {
			// queueing data item to send it later
			// @todo add option to disable queueing in settings
			packetQueue.push(data);

			return false;
		}

		try {
			provider.send(data);
		} catch (error) {
			self.onError(error);

			return false;
		}

		return true;
	}

	self.connected = function() {
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
			// @todo insert it with the same index if there is no success
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

		// specially for custom providers
		if ('init' in provider) {
			provider.init();
		}

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
		initProvider(settings['url']['websocket']);
	}

	/*
	if (!result) {
		WebSocketProvider = {};

		// default constants
		WebSocketProvider.prototype.CONNECTING = 0;
		WebSocketProvider.prototype.OPEN       = 1;
		WebSocketProvider.prototype.CLOSED     = 2;
	}
	*/

	if (
		!result
		&& 'websocket' in settings['url']
	) {
		// checking for flash plugin
		var flashInstalled = false;
		if ('plugins' in navigator) {
			for (var i in navigator.plugins) {
				var plugin = navigator.plugins[i];

				if (
					'description' in plugin
					&& plugin.description.indexOf('Shockwave Flash') >= 0
				) {
					flashInstalled = true;
					break;
				}
			}
		} else
		if ('mimeTypes' in navigator) {
			var tmp = navigator.mimeTypes['application/x-shockwave-flash'];

			if (
				tmp
				&& tmp.enabledPlugin
			) {
				flashInstalled = true;
			}
		}

		if (flashInstalled) {
			// @todo setTimeout for check ?
			$.getScript(settings['jspath'] + 'fabridge.js', function() {
				WebSocketFlashSWFPath = settings['jspath'] + 'flash.swf';

				$.getScript(settings['jspath'] + 'websocket.flash.js', function() {
					initProvider(settings['url']['websocket']);
				} )
			} );
		}
	}

	// @todo check other providers
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
