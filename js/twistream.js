(function($) {
	
	$.twistream = function() {
		var settings = arguments[0] || { };
		
		var self = this;
		
		var map = null;
		
		var logtimer = null;
		
		var topElement = $('#top');
		var logger = $('#logger');
	
		topElement.css( { opacity: 0.8 } );
		$('#tweets').css( { opacity: 0.8 } );
		
		var _log = function(message) {
			logger
				.html(message)
				.fadeIn('slow');
				
			setTimeout(function() {
				logger.fadeOut('slow');
			}, 2000)
		}
		
		var log = function(message) {
			if (null != logtimer) {
				clearTimeout(logtimer);
				logger.fadeOut('fast', function() {
					_log(message);
				} );
			} else {
				_log(message);	
			}
		}

		$('input', topElement)
			.mouseover( function() {
				topElement.animate({opacity: 1});
			} )
			.mouseout( function() {
				topElement.animate({opacity: 0.8});
			} );

//		if ('map' in settings) {
			map = new google.maps.Map(
				document.getElementById('maps'), {
					zoom: 10,
					center: new google.maps.LatLng(-34.397, 150.644),
					disableDefaultUI: true,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				}				
			);
//		}

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition( function(position) {
				if (
					'coords' in position
					&& 'latitude' in position.coords
				) {
					log('Initial coordinates changed');
					
					map.setCenter(
						new google.maps.LatLng(
							position.coords.latitude,
							position.coords.longitude
						)
					);
				}
			} );
		}

		var addTweet = function(tweetObj) {
			var txt = tweetObj.tweet.text;

			// preparing nicks
			txt = txt.replace(
				/(^|\s)@(\w+)/g,
				'$1<a class="nick" href="http://twitter.com/#!/$2">@$2</a>'
			);

			// preparing hashtags
			txt = txt.replace(
				/(^|\s)#(\w+)/g, 
				'$1<a class="hash" href="http://search.twitter.com/search?q=%23$2">#$2</a>'
			);

			var tweet = $('<div></div>')
				.addClass('tweet')
				.html(txt)
				.hide();

			$('<img></img>')
				.attr('src', tweetObj.tweet.user.profile_image_url)
				.prependTo(tweet);

			tweet
				.prependTo('#tweets')
				.slideDown('fast', 'linear');
		}
		
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
					track: 'google'
				});	
			},
			onError: function(error) {
				console.dir(error);
			},
			onMessage: function(msg) {
				var data = $.evalJSON(msg.data);
				addTweet(data);
			}
		});
	}
	
})(jQuery);
