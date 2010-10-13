(function($) {
	
	$.twistream = function() {
		var settings = arguments[0] || { };
		
		var self = this;
		
		$('#top').css( {
			opacity: 0.7
		} );
		
		var connection = new WebSocketConnection({
			url: settings['url'],
			
			onReady: function() {
				console.dir(this);
				console.dir(this.connected());
			}
		});
	}
	
})(jQuery);