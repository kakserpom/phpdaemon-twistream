(function($) {
	
	$.twistream = function() {
		var settings = arguments[0] || { };
		
		var self = this;
		var map = null;
		var topElement = $('#top');	
	
		topElement.css( { opacity: 0.8 } );
		$('#tweets').css( { opacity: 0.8 } );

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
					zoom: 5,
					center: new google.maps.LatLng(-34.397, 150.644),
					disableDefaultUI: true,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				}				
			);
//		}

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
