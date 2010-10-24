(function($) {

	$.twistream = function(s) {
		var self = this;
	
		/**
		 * Settings for application
		 */
		var settings = $.extend( {
			// default settings
			feed: 'body'
		}, s);
		
		/**
		 * Object to collect useful places
		 */
		var places = {
			stopplay: $('#sp img'),
			header: $('#top')
		};

		/**
		 * Object for the stream filter params
		 */
		var params = {
			mapZoom: 10,
			// Moscow coordinates by default
			mapCenterLng: 55.755786121111, 
			mapCenterLat: 37.617633343333
		}

		/**
		 * Websocket connection
		 * @type {Object}
		 */
		var connection = null;

		/**
		 * Tweets array
		 * @type {Array}
		 */
		var tweets = [];
		
		/**
		 * Markers array
		 * @type {Array}
		 */
		var markers = [];

		/**
		 * Timer to hide old log message
		 */
		var logtimer = null;
		
		/**
		 * Timer to handle params is changed
		 */
		var pchangedtimer = null;

		/**
		 * Paused?
		 * @type {Boolean} 
		 */
		var paused = false;

		/**
		 * Update the state of pause/play button image
		 */
		var updateState = function() {
			if (paused) {
				places.stopplay.attr( {
					src: 'img/play.png',
					title: 'resume'
				} );
			} else {
				places.stopplay.attr( {
					src: 'img/pause.png',
					title: 'pause'
				} );
			}
		}

		/**
		 * Toggle stream state
		 */
		var togglePause = function() {
			paused = !paused;
			
			// updating image on the button
			updateState();

			if (paused) {
				log('Pause');
			} else {
				log('Resuming');
			}

			// apply params
			changeParams();
		}

		/**
		 * Log some message in logger place (settings.logger)
		 * @param {string} message Message to log
		 */
		var log = function(message) {
			if (!('logger' in places)) {
				return;
			}
		
			var _log = function(message) {
				places.logger
					.html(message)
					.fadeIn('slow');

				logtimer = setTimeout(function() {
					places.logger.fadeOut('slow');
				}, 2000)
			}
		
			if (null != logtimer) {
				clearTimeout(logtimer);
				
				places.logger.fadeOut('fast', function() {
					_log(message);
				} );
			} else {
				_log(message);
			}
		}

		/**
		 * Add tweet to the feed
		 * @param {!Object} tweetObj Tweet object
		 */
		var addTweet = function(tweetObj) {
			if (
				null === tweetObj
				|| !('tweet' in tweetObj)
				|| null === tweetObj.tweet
			) {
				return;
			}
			
			var marker = null;

			if ('map' in places) {
				// prepare and set the tweet marker on the map

				var markerLat = null;
				var markerLng = null;

				// checking the accurate geolocation in 'geo' tweet object
				if (
					'geo' in tweetObj.tweet
					&& null !== tweetObj.tweet.geo
				) {
					markerLat = tweetObj.tweet.geo.coordinates[0];
					markerLng = tweetObj.tweet.geo.coordinates[1];
				} else
				// checking for inaccurate 'place' object in tweet
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
					}
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
						map: places.map,
						title: 'Tweet',
						icon: 'img/marker.gif'
					} );
				}
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
				.prependTo(places.feed)
				.slideDown('fast', 'linear');

			tweets.push({
				element: tweet,
				marker: marker
			});

			// check for visible tweets
			
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

		var changeParams = function() {
			if (null != connection) {	
				if (connection.connected()) {
					connection.close();
				}
			}

			if (paused) {
				return;
			}

			log('Applying new stream subscription params');

			var requestAttrs = {} /*{
				track: 'google'
			};*/;

			if ('map' in places) {
				var mapBounds = places.map.getBounds();
				if (null != mapBounds) {
					var mapBoundsNE = mapBounds.getNorthEast();
					var mapBoundsSW = mapBounds.getSouthWest();

					var cuttedEdge = mapBoundsNE.lng() - 
						(mapBoundsNE.lng() - mapBoundsSW.lng()) / 100 * 31;
	
					requestAttrs['locations'] =
						mapBoundsSW.lng() + ',' + mapBoundsSW.lat() + ',' +
						cuttedEdge + ',' + mapBoundsNE.lat();
				}
			}

			var packet = $.toJSON( {
				'cmd'   : 'subscribe',
				'attrs' : requestAttrs
			} );

			connection = new WebSocketConnection( {
				url: settings['url'],

				onConnected: function() {
					console.info('connected');
				
					if (
						'makeup' in settings
						&& settings.makeup
					) { 
						// 'tis a temporary block just for makeup
					}
					else {
						console.info('send');
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
		
// ---------------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------------

		if ('feed' in settings) {
			places.feed = $(settings.feed);
		}

		if ('logger' in settings) {
			places.logger = $(settings.logger);
		}
		
		// make keywords input item fading on mouseout/mousein
		$('input', places.header)
			.mouseover( function() {
				places.header.animate({opacity: 1});
			} )
			.mouseout( function() {
				places.header.animate({opacity: 0.8});
			} );

// ---------------------------------------------------------------------------------
		
		places.header.css( { opacity: 0.8 } );
		places.feed.css(   { opacity: 0.9 } );
		
		places.stopplay.click(togglePause);
		
// ---------------------------------------------------------------------------------
// Some code to work with google maps
// ---------------------------------------------------------------------------------
			
		if ('localStorage' in window) {
			// maybe we already have coordinates in localStorage?
			
			params.mapZoom      = parseInt(   localStorage.getItem('map_zoom') || params.mapZoom );
			params.mapCenterLng = parseFloat( localStorage.getItem('map_lng')  || params.mapCenterLng );
			params.mapCenterLat = parseFloat( localStorage.getItem('map_lat')  || params.mapCenterLag );
		}
				
		if ('map' in settings) {
			var mapCenter = new google.maps.LatLng(
				params.mapCenterLat, 
				params.mapCenterLng
			);
			
			var mapElement = $(settings.map);
			
			if (0 === mapElement.length) {
				return false;
			}
		
			places.map = new google.maps.Map(mapElement[0], {
				zoom:             params.mapZoom,
				center:           mapCenter,
				disableDefaultUI: true,
				mapTypeId:        google.maps.MapTypeId.ROADMAP
			} );
		
			var mapCoordsChangedHandler = function() {
				if (
					'localStorage' in window
				) {
					var mapCenter = places.map.getCenter();

					localStorage.setItem('map_lat', mapCenter.lat());
					localStorage.setItem('map_lng', mapCenter.lng());
					localStorage.setItem('map_zoom', places.map.getZoom());
				}

				paramsChangedHandler();
			}
			
			places.map.bounds_changed = function() {
				mapCoordsChangedHandler();
			}

			places.map.center_changed = function() {
				mapCoordsChangedHandler();
			}
		}

		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition( function(position) {
				if (
					'coords' in position
					&& 'latitude' in position.coords
				) {
					log('Center coordinates changed by browser geolocation result');

					if ('map' in places) {
						places.map.setCenter(
							new google.maps.LatLng(
								position.coords.latitude,
								position.coords.longitude
							)
						);
					}
					
					changeParams();
				}
			} );
		} else {
			changeParams();
		}

// ---------------------------------------------------------------------------------

		updateState();
		changeParams();  // FIXME for debug

// ---------------------------------------------------------------------------------
// Something to test and for a makeup
// ---------------------------------------------------------------------------------

		if (
			'makeup' in settings
			&& settings.makeup
		) {
			addTweet( {
				tweet: {
					text: 'Testing @silentroach tweet with many words and lines O.o great ' +
						'for makeup fixing and something to test. Don\'t know where to found ' +
						'enough words to make tweet bigger in height, so just test some links ' +
						'http://yfrog.com/3r7mzqj and a #hashtag and #hashtag2 and big links ' +
						'like this http://habrahabr.ru/blogs/gadgets/106319/ that\'s all.',
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
