WebSocketConnection = function() {

	this.WS = null;
	
	/**
	 * Close the connection
	 */
	this.close = function() {
		if (this.WS) {
			this.WS.close();
		}
	}
	
	/**
	 * Send data to the server
	 */
	this.send = function(data) {
		if (this.WS) {
			this.WS.send(data);
		}
	}

}
