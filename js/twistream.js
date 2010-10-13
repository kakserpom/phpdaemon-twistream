(function($) {
	
	$.twistream = function() {
		this.keyword = 'php';
	
		var settings = arguments[0] || { };
		
		var self = this;
		
		$('#top').css( {
			opacity: 0.7
		} );
		
		var sendPacket = function(data) {
			var packet = $.toJSON(data);
			
			try {
				connection.send(packet);
			} catch (error) {
				console.error(error.message);
			}
		}
		
		var subscribe = function(attrs) {
			sendPacket({
				'cmd'   : 'subscribe',
				'attrs' : attrs
			});
		}
		
		var connection = new WebSocketConnection({
			url: settings['url'],
			
			onConnected: function() {
				subscribe({
					track: 'php'
				});	
			},
			onMessage: function(msg) {
				console.dir(msg);
			}
		});
	}
	
})(jQuery);
