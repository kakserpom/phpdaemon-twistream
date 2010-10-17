(function($) {

	$.twistream = function() {
		var settings = arguments[0] || { };

		var self = this;

		var map = null;

		var connection = null;
		var tweets = [];

		var logtimer = null;
		var pchangedtimer = null;

		var topElement = $('#top');
		var logger = $('#logger');

		topElement.css( { opacity: 0.8 } );
		$('#tweets').css( { opacity: 0.9 } );

		var _log = function(message) {
			logger
				.html(message)
				.fadeIn('slow');

			logtimer = setTimeout(function() {
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

		var mapCenter = new google.maps.LatLng(-34.397, 150.644);
		var mapZoom   = 10;

		// @todo don't ask user for geo if settings are found in localStorage

		if ('localStorage' in window) {
			mapZoom = parseInt(localStorage.getItem('map_zoom') || mapZoom);

			mapCenter = new google.maps.LatLng(
				parseFloat(localStorage.getItem('map_lng') || mapCenter.lng()),
				parseFloat(localStorage.getItem('map_lat') || mapCenter.lat())
			);
		}

//		if ('map' in settings) {
			map = new google.maps.Map(
				document.getElementById('maps'), {
					zoom: mapZoom,
					center: mapCenter,
					disableDefaultUI: true,
					mapTypeId: google.maps.MapTypeId.ROADMAP
				}
			);
//		}

		var checkVisibleTweets = function() {
			if (tweets.length === 0) {
				// not impossible O.o
				return;
			}

			var el = tweets[0].element;

			if (el[0].offsetTop > window.innerHeight * 2) {
				el.remove();
				tweets.shift();
			}
		}

		var addTweet = function(tweetObj) {
			if (
				null === tweetObj
				|| !('tweet' in tweetObj)
				|| null === tweetObj.tweet
			) {
				return;
			}

			var txt = tweetObj.tweet.text;

			// preparing nicks
			txt = txt.replace(
				/(^|\s)@(\w+)/g,
				'$1<a class="nick" target="_blank" href="http://twitter.com/#!/$2">@$2</a>'
			);

			// preparing hashtags
			txt = txt.replace(
				/(^|\s)#(\w+)/g,
				'$1<a class="hash" target="_blank" href="http://search.twitter.com/search?q=%23$2">#$2</a>'
			);

			var tweet = $('<div></div>')
				.addClass('tweet')
				.hide();

			$('<img></img>')
				.attr('src', tweetObj.tweet.user.profile_image_url)
				.prependTo(tweet);

			$('<p></p>')
				.html(txt)
				.appendTo(tweet);

			tweet
				.prependTo('#tweets')
				.slideDown('fast', 'linear');

			tweets.push({
				element: tweet
			});

			checkVisibleTweets();
		}

		var changeParams = function() {
			log('Applying new stream subscription params');

			if (null != connection) {
				if (connection.connected()) {
					connection.close();
				}
			}

			var requestAttrs = {} /*{
				track: 'google'
			};*/;

			var mapBounds = map.getBounds();
			if (null != mapBounds) {
				var mapBoundsNE = mapBounds.getNorthEast();
				var mapBoundsSW = mapBounds.getSouthWest();

				requestAttrs['locations'] =
					mapBoundsSW.lng() + ',' + mapBoundsSW.lat() + ',' +
					mapBoundsNE.lng() + ',' + mapBoundsNE.lat();
			}

			var packet = $.toJSON( {
				'cmd'   : 'subscribe',
				'attrs' : requestAttrs
			} );

			connection = new WebSocketConnection( {
				url: settings['url'],

				onConnected: function() {
					console.dir(packet);
					this.send(packet);
				},

				onError: function() {
					log('Error. Trying to reconnect in 5 seconds.');
					setTimeout(changeParams, 5000);
				},

				onMessage: function(msg) {
					var data = $.evalJSON(msg.data);
					//console.dir(data);
					addTweet(data);
				}
			} );

			connection.send(packet);
		}

		var paramsChangedHandler = function() {
			if (null != pchangedtimer) {
				clearTimeout(pchangedtimer);
			}

			pchangedtimer = setTimeout(changeParams, 2000);
		}

		var mapCoordsChangedHandler = function() {
			if (
				'localStorage' in window
				&& null != map
			) {
				var mapCenter = map.getCenter();

				localStorage.setItem('map_lat', mapCenter.lat());
				localStorage.setItem('map_lng', mapCenter.lng());
				localStorage.setItem('map_zoom', map.getZoom());
			}

			paramsChangedHandler();
		}

		map.bounds_changed = function() {
			mapCoordsChangedHandler();
		}

		map.center_changed = function() {
			mapCoordsChangedHandler();
		}

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition( function(position) {
				if (
					'coords' in position
					&& 'latitude' in position.coords
				) {
					//log('Initial coordinates changed');

					map.setCenter(
						new google.maps.LatLng(
							position.coords.latitude,
							position.coords.longitude
						)
					);
				}

				//changeParams();
			} );
		} else {
			changeParams();
		}
	}

})(jQuery);
