(function($) {

	$.twistream = function() {
		var settings = arguments[0] || { };

		var self = this;

		var map = null;

		var connection = null;

		var tweets = [];
		var markers = [];

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

			var el = tweets[0].element[0];

			if (el.offsetTop > window.innerHeight) {
				el = tweets.shift();

				el.element.remove();

				if (null != el.marker) {
					el.marker.setMap(null);
				}
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

			// geo

			var markerLat = null;
			var markerLng = null;

			if (
				'geo' in tweetObj.tweet
				&& null !== tweetObj.tweet.geo
			) {
				markerLat = tweetObj.tweet.geo.coordinates[0];
				markerLng = tweetObj.tweet.geo.coordinates[1];
			} else
			if (
				'place' in tweetObj.tweet
				&& null !== tweetObj.tweet.place
			) {
				var coord = tweetObj.tweet.place.bounding_box.coordinates.shift();

				if (coord) {
					while (true) {
						var poly = coord.shift();

						if (poly) {
							if (null === markerLng) {
								markerLng = poly[0]
							} else {
								markerLng = (markerLng + poly[0]) / 2;
							}

							if (null === markerLat) {
								markerLat = poly[1];
							} else {
								markerLat = (markerLat + poly[1]) / 2;
							}
						} else {
							break;
						}
					}
				} else {
					console.info('coords not found in tweet object');
				}
			} else {
				console.info('nothing is set in tweet coords');
				console.dir(tweetObj.tweet);
			}

			if (
				null != markerLat
				&& null != markerLng
			) {
				var marker = new google.maps.Marker( {
					position: new google.maps.LatLng(
						markerLat,
						markerLng
					),
					map: map,
					title: 'Tweet',
					icon: 'img/marker.gif'
				} );
			} else {
				var marker = null;
			}

			// tweet

			var txt = tweetObj.tweet.text;

			// preparing urls
			txt = txt.replace(
				/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&\?\/.=]+/g,
				function(url) {
					var stripped = url;

					if (stripped.length > 25) {
						stripped = stripped.substring(0, 25) + '...';
					}

					return '<a target="_blank" href="' + url + '" title="' + url + '">' + stripped + '</a>';
				}
			);

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

			var avatar = $('<a></a>')
				.addClass('avatar')
				.attr( {
					'href': 'http://twitter.com/#!/' + tweetObj.tweet.user.screen_name,
					'target': '_blank',
					'title': '@' + tweetObj.tweet.user.screen_name + (
						'name' in tweetObj.tweet.user 
							? ' (' + tweetObj.tweet.user.name + ')'
							: ''
						)
				} )
				.appendTo(tweet);

			$('<img />')
				.attr('src', tweetObj.tweet.user.profile_image_url)
				.appendTo(avatar);

			$('<p></p>')
				.html(txt)
				.appendTo(tweet);

			tweet
				.prependTo('#tweets')
				.slideDown('fast', 'linear');

			tweets.push({
				element: tweet,
				marker: marker
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
					if (
						'makeup' in settings
						&& settings.makeup
					) { 
						// 'tis a temporary block just for makeup
					}
					else {
						this.send(packet);
					}
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

		if (
			'makeup' in settings
			&& settings.makeup
		) {
			addTweet( {
				tweet: {
					text: 'Testing @silentroach tweet with many words and lines O.o great for makeup fixing and something to test. Don\'t know where to found enough words to make tweet bigger in height, so just test some links http://yfrog.com/3r7mzqj and a #hashtag and #hashtag2 and big links like this http://habrahabr.ru/blogs/gadgets/106319/ that\'s all.',
					user: {
						screen_name: 'silentroach',
						profile_image_url: 'http://a2.twimg.com/profile_images/24736482/a_a09b53a_normal.jpg'
					},
					geo: {
						coordinates: [
							55.6109221,
							37.6985258
						]
					}
				}
			} );
		}
	}

})(jQuery);
