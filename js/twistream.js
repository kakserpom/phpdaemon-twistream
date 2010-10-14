(function($) {
	
	$.twistream = function() {
		this.keyword = 'php';
	
		var settings = arguments[0] || { };
		
		var self = this;
		
		$('#top').css( {
			opacity: 0.7
		} );

		var addTweet = function(tweetObj) {
			console.dir(tweetObj);

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
				.css( {
					position: 'absolute',
					top: (Math.floor(Math.random() * 80 + 1)) + '%',
					left: '150%',
					opacity: 0.8
				} );

			$('<img></img>')
				.attr('src', tweetObj.tweet.user.profile_image_url)
				.prependTo(tweet);

			tweet
				.appendTo('body')
				.animate( {
					left: '-50%'
				}, 20000);
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
					track: 'php'
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
