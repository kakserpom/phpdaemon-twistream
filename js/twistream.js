(function($) {
	
	$.twistream = function() {
		var self = this;
		var settings = arguments[0] || { };
		
		var connection = new WebSocketConnection({
			url: settings['url'],
			
			onReady: function() {
				console.dir(this);
				console.dir(this.connected());
			}
		});
	}
	
})(jQuery);