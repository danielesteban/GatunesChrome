'use strict';

window.API = (function() {
	var Request = function(url, params, callback) {
		var query;
		for(var key in params) {
			query = !query ? '?' : (query + '&');
			query += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
		}

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function() {
			if(xhr.readyState != 4) return;

			var data;
			try {
				data = JSON.parse(xhr.responseText);
			} catch(e) {
				return callback();
			}
		
			callback(data);
		};

		xhr.onerror = function(error) {
			callback();
		};

		xhr.open("GET", url + query, true);
		xhr.send(null);
	};

	var LastFm = (function() {
		function LastFm() {
			this.key = '050700332b4c3df96f22a89ce417f934';
		}

		LastFm.prototype.Request = function(method, params, callback) {
			params.api_key = this.key;
			params.format = 'json';
			params.method = method;
			Request('http://ws.audioscrobbler.com/2.0/', params, callback);
		};

		LastFm.prototype.GetTopTags = function(callback) {
			if(this.topTags) return callback(JSON.parse(JSON.stringify(this.topTags)));
			var self = this;
			this.Request('chart.gettoptags', {
				limit: 50
			}, function(data) {
				self.topTags = [{
					name: 'Country_Spain'
				}];
				data.tags.tag.forEach(function(tag) {
					if([
						'seen live'
					].indexOf(tag.name) !== -1) return;

					tag.name = tag.name.substr(0, 1).toUpperCase() + tag.name.substr(1).toLowerCase();
					self.topTags.push(tag);
				});
				callback(JSON.parse(JSON.stringify(self.topTags)));

				var index = 0,
					getThumbnails = function() {
						if(++index >= self.topTags.length) return;
						var tag = self.topTags[index];
						self.GetTagTracks(tag.name, function(tracks) {
							tracks.forEach(function(track) {
								!tag.image && track.image.length && (tag.image = track.image[track.image.length - 1]['#text']);
							});
							tag.image && Subscriptions.broadcast('tag', {
								name: tag.name,
								image: tag.image
							});
							getThumbnails();
						}, 0, 2);
					};

				self.GetCountryTracks('Spain', function(tracks) {
					var tag = self.topTags[index];
					tracks.forEach(function(track) {
						!tag.image && track.image.length && (tag.image = track.image[track.image.length - 1]['#text']);
					});
					tag.image && Subscriptions.broadcast('tag', {
						name: tag.name,
						image: tag.image
					});
					getThumbnails();
				}, 0, 2);
			});
		};

		LastFm.prototype.GetTagTracks = function(query, callback, page, limit) {
			if(query.indexOf('Country_') === 0) return this.GetCountryTracks(query.substr(query.indexOf('Country_') + 8), callback, page, limit);
			var params = {
					tag: query,
					limit: limit || 50
				};

			page && (params.page = page);
			this.Request('tag.getTopTracks', params, function(data) {
				callback(data.toptracks && data.toptracks.track ? data.toptracks.track.length ? data.toptracks.track : [data.toptracks.track] : []);
			});
		};

		LastFm.prototype.GetCountryTracks = function(query, callback, page, limit) {
			var params = {
					country: query,
					limit: limit || 50
				};

			page && (params.page = page);
			this.Request('geo.getTopTracks', params, function(data) {
				callback(data.toptracks && data.toptracks.track ? data.toptracks.track.length ? data.toptracks.track : [data.toptracks.track] : []);
			});
		};

		LastFm.prototype.GetArtists = function(query, callback, page, limit) {
			var params = {
					artist: query,
					limit: limit || 50
				};

			page && (params.page = page);
			this.Request('artist.search', params, function(data) {
				callback(data.results && data.results.artistmatches && data.results.artistmatches.artist ? data.results.artistmatches.artist.length ? data.results.artistmatches.artist : [data.results.artistmatches.artist] : []);
			});
		};

		LastFm.prototype.GetTrack = function(query, callback) {
			var params = {
					track: query,
					limit: 1
				};

			this.Request('track.search', params, function(data) {
				callback(data.results && data.results.trackmatches &&  data.results.trackmatches.track ? data.results.trackmatches.track.length ? data.results.trackmatches.track[0] : data.results.trackmatches.track : null);
			});
		};

		LastFm.prototype.GetArtistTracks = function(artist, callback, page, limit) {
			var params = {
					limit: limit || 50
				};

			if(artist.mbid) params.mbid = artist.mbid;
			else params.artist = artist.name;
			page && (params.page = page);
			this.Request('artist.getTopTracks', params, function(data) {
				callback(data.toptracks && data.toptracks.track ? data.toptracks.track.length ? data.toptracks.track : [data.toptracks.track] : []);
			});
		};

		LastFm.prototype.GetSimilarTracks = function(track, callback, limit) {
			var params = {
					limit: limit || 50,
					autocorrect: 1
				};

			if(track.mbid) params.mbid = track.mbid;
			else {
				params.artist = track.artist;
				params.track = track.name;
			}
			this.Request('track.getSimilar', params, function(data) {
				callback(data.similartracks && data.similartracks.track ? data.similartracks.track.length ? data.similartracks.track : [data.similartracks.track] : []);
			});
		};

		return new LastFm();
	}());

	var Youtube = (function() {
		function Youtube() {
			this.matches = [];
			this.videos = [];
		}

		Youtube.prototype.GetID = function(url) {
			var match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
			if(match && match[2].length == 11) return match[2];
		};

		Youtube.prototype.Search = function(query, callback, page) {
			var params = {
					alt: 'json',
					format: 5,
					vq: query,
					'start-index': ((page || 0) * 50) + 1,
					'max-results': 50
				}, url;

			Request('https://gdata.youtube.com/feeds/api/videos', params, callback);
		};

		Youtube.prototype.BestMatch = function(track, callback) {
			for(var i=0; i<this.matches.length; i++) {
				var match = this.matches[i];
				if(track.mbid && match.mbid && track.mbid === match.mbid) return callback(match);
				if(!track.mbid && track.artist.name === match.artist && track.name === match.name) return callback(match);
			}
			
			var self = this,
				name = track.artist.name + ' ' + track.name,
				getWords = function(str) {
					var ws = [];
					str.split(' ').forEach(function(w) {
						w = w.toLowerCase().trim();
						ws.indexOf(w) === -1 && ws.push(w);
					});
					return ws;
				},
				words = getWords(name),
				nameWords = getWords(track.name),
				badWords = function() {
					var bw = [
							'cover',
							'live',
							'edit',
							'remix',
							'reversed',
							'backwards',
							'lesson',
							'tribute'
						], l = bw.length;

					for(var x=0; x<l; x++) {
						if(words.indexOf(bw[x]) !== -1) {
							bw.splice(x, 1);
							x--;
							l--;
						}
					}
					return bw;
				}();

			this.Search(name, function(r) {
				if(!r.feed || !r.feed.entry) return callback();
				var videos = [];
				r.feed.entry.forEach(function(video, i) {
					var videoWords = getWords(video.title.$t.replace(/ - /g, ' ').replace(/ \/ /g, ' ')),
						wCount = 0,
						nameWCount = 0,
						bwCount = 0;

					words.forEach(function(w) {
						if(videoWords.indexOf(w) === -1) return;
						wCount++; 
						nameWords.indexOf(w) !== -1 && nameWCount++;
					});

					badWords.forEach(function(w) {
						videoWords.indexOf(w) !== -1 && bwCount++;		
					});

					video.duration = parseInt(video.media$group.yt$duration ? video.media$group.yt$duration.seconds : 0, 10);
					videos.push({
						index: i,
						id: video.id.$t.substr(video.id.$t.lastIndexOf('/') + 1),
						title: video.title.$t,
						duration: video.duration,
						timeDiff: Math.abs(video.duration - track.duration),
						wCount: wCount,
						bwCount: bwCount,
						exactMatch: wCount === videoWords.length,
						nameMatch: nameWCount === nameWords.length,
						hd: video.yt$hd ? true : false
					});
				});
				videos.sort(function(a, b) {
					return b.bwCount > a.bwCount ? -1 : (b.bwCount < a.bwCount ? 1 : 
						(a.exactMatch > b.exactMatch ? -1 : (a.exactMatch < b.exactMatch ? 1 : 
							(a.nameMatch > b.nameMatch ? -1 : (a.nameMatch < b.nameMatch ? 1 : 
								(b.timeDiff > a.timeDiff ? -1 : (b.timeDiff < a.timeDiff ? 1 : 
									(a.hd > b.hd ? -1 : (a.hd < b.hd ? 1 :
										(a.wCount > b.wCount ? -1 : (a.wCount < b.wCount ? 1 :
											(b.index > a.index ? -1 : (b.index < a.index ? 1 :
						0)))))))))))));
				});
				if(!videos[0] || videos[0].wCount < nameWords.length) return callback();
				var match = {
						id: videos[0].id,
						duration: videos[0].duration
					};

				if(track.mbid) match.mbid = track.mbid;
				else {
					match.artist = track.artist.name;
					match.name = track.name;
				}
				self.matches.push(match);
				callback(match);
			});
		};

		Youtube.prototype.GetVideo = function(videoId, callback) {
			if(this.videos[videoId]) return callback(this.videos[videoId]);
			var self = this;
			Request('https://gdata.youtube.com/feeds/api/videos/' + videoId, {alt: 'json'}, function(data) {
				if(!data.entry) return callback();
				callback(self.videos[videoId] = data.entry);
			});
		};

		return new Youtube();
	}());

	var Player = (function() {
		function Player() {
			this.interval = null;
			this.playlist = null;

			var self = this;
			this.tab = null;
			chrome.tabs.getAllInWindow(undefined, function(tabs) {
				for(var i=0, tab; tab=tabs[i]; i++) {
					if(tab.url && tab.url.indexOf('https://www.youtube.com/') === 0) {
						self.tab = tab;
						var videoId = Youtube.GetID(tab.url);
						videoId && self.setPlayingVideo(videoId);
						break;
					}
				}
			});
		}

		Player.prototype.load = function(index) {
			if(this.playlist === null || !this.playlist.tracks[index]) return;

			var self = this,
				videoId = this.playlist.tracks[index].video.id,
				url = 'https://www.youtube.com/watch?v=' + videoId;

			if(this.tab !== null) return Youtube.GetID(this.tab.url) !== videoId && chrome.tabs.update(this.tab.id, {url: url});
			chrome.tabs.getAllInWindow(undefined, function(tabs) {
				for(var i=0, tab; tab=tabs[i]; i++) {
					if(tab.url && tab.url.indexOf('https://www.youtube.com/') === 0) {
						self.tab = tab;
						return chrome.tabs.update(tab.id, {url: url});
					}
				}
				chrome.tabs.create({url: url}, function(tab) {
					self.tab = tab;
				});
			});
		};

		Player.prototype.getPlayingIndex = function() {
			if(this.playlist === null || this.playing === null) return null;
			var videoId = this.playing.video.id,
				index = null;
			
			this.playlist.tracks.forEach(function(t, i) {
				index === null && t.video.id === videoId && (index = i);
			});
			return index;
		};

		Player.prototype.prev = function() {
			var index = this.getPlayingIndex();
			if(index === null || --index < 0) index = this.playlist.tracks.length - 1;
			this.load(index);
		};

		Player.prototype.next = function() {
			var index = this.getPlayingIndex();
			if(index === null || ++index > this.playlist.tracks.length) index = 0;
			this.load(index);
		};

		Player.prototype.setPlayingVideo = function(videoId) {
			var self = this,
				sendEvent = function() {
					Subscriptions.broadcast('playing', self.playing);
				};

			if(!videoId) return sendEvent(this.playing = null);

			var track;
			this.playlist !== null && this.playlist.tracks.forEach(function(t) {
				!track && t.video.id === videoId && (track = t);
			});

			if(track) return sendEvent(this.playing = track);

			Youtube.GetVideo(videoId, function(video) {
				if(!video) return sendEvent(self.playing = null);
				LastFm.GetTrack(video.title.$t, function(track) {
					if(!track) self.playing = null;
					else {
						track.artist = {name: track.artist};
						track.video = {
							id: video.id.$t.substr(video.id.$t.lastIndexOf('/') + 1),
							duration: parseInt(video.media$group.yt$duration ? video.media$group.yt$duration.seconds : 0, 10)
						};

						if(track.mbid) track.video.mbid = track.mbid;
						else {
							track.video.artist = track.artist.name;
							track.video.name = track.name;
						}

						self.playing = track;
					}
					sendEvent();
				});
			});
		};

		return new Player();
	}());

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
		if(!changeInfo.url || Player.tab === null || Player.tab.id !== tabId) return;
		Player.tab = tab;
		clearInterval(Player.interval);
		Player.interval = null;
		var videoId = Youtube.GetID(Player.tab.url);
		if(!videoId) return;
		Player.setPlayingVideo(videoId);
		Player.interval = setInterval(function() {
			chrome.tabs.executeScript(tabId, {
				code: 'var player = document.getElementById("movie_player"); var ended = !player || player.className.indexOf("ended-mode") !== -1; ended'
			}, function(results) {
				if(!results[0]) return;
				clearInterval(Player.interval);
				Player.interval = null;
				Player.next();
				Player.setPlayingVideo(null);
			});
		}, 250);
	});

	chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
		if(Player.tab === null || Player.tab.id !== tabId) return;
		Player.tab = null;
		clearInterval(Player.interval);
		Player.interval = null;
		Player.playing = null;
		chrome.browserAction.setPopup({string: ''});
	});

	var Playlists = [];

	var Subscriptions = (function() {
		function Subscriptions() {
			this.subscriptions = [];
			this.subscriptionId = 1;
		}

		Subscriptions.prototype.add = function(handler) {
			var subscription = {
					id: this.subscriptionId++,
					handler: handler
				};

			this.subscriptions.push(subscription);
			return subscription.id;
		};

		Subscriptions.prototype.remove = function(subscriptionId) {
			for(var i=0; i<this.subscriptions.length; i++) {
				if(this.subscriptions[i].id === subscriptionId) {
					this.subscriptions.splice(i, 1);
					break;
				}
			}
		};

		Subscriptions.prototype.broadcast = function(event, data) {
			this.subscriptions.forEach(function(subscription) {
				subscription.handler(event, data);
			});
		};

		Subscriptions.prototype.send = function(subscriptionId, event, data) {
			for(var i=0; i<this.subscriptions.length; i++) {
				if(this.subscriptions[i].id === subscriptionId) {
					this.subscriptions[i].handler(event, data);
					break;
				}
			}
		};

		return new Subscriptions();
	}());

	return {
		GetTopTags: function(params, callback) {
			LastFm.GetTopTags(callback);
		},
		GetPlaylist: function(params, callback) {
			var playlist;
			Playlists.forEach(function(p) {
				if(params.artist) {
					if(params.artist.mbid) {
						p.artist && p.artist.mbid && p.artist.mbid === params.artist.mbid && (playlist = p);
					} else  {
						p.artist && !p.artist.mbid && p.artist.name === params.artist.name && (playlist = p);
					}
				} else if(params.tag) {
					p.tag && p.tag === params.tag && (playlist = p);
				} else if(params.track) {
					if(params.track.mbid) {
						p.track && p.track.mbid && p.track.mbid === params.track.mbid && (playlist = p);
					} else {
						p.track && !p.track.mbid && p.track.artist.name === params.track.artist && p.track.name === params.track.name && (playlist = p);
					}
				}
			});
			
			if(!playlist) {
				Playlists.push(playlist = JSON.parse(JSON.stringify(params)));
				playlist.tracks = [];

				var shuffle = function(tracks) {
						for(var j=0; j<6; j++) tracks.sort(function() {
							return Math.round(Math.random()) - 0.5;
						});
					},
					subscription = JSON.parse(JSON.stringify(params)),	
					match = function(tracks) {
						var track = tracks.shift();
						if(!track) return;
						Youtube.BestMatch(track, function(video) {
							if(video) {
								track.video = video;
								playlist.tracks.push(track);
								Subscriptions.broadcast('track', {
									playlist: subscription,
									track: JSON.parse(JSON.stringify(track))
								});
							}
							match(tracks);
						});
					};

				if(playlist.artist) {
					LastFm.GetArtistTracks(playlist.artist, function(artistTracks) {
						if(!artistTracks.length) return;
						shuffle(artistTracks);
						var track = {name: artistTracks[0].name};
						if(artistTracks[0].mbid) track.mbid = artistTracks[0].mbid;
						else track.artist = artistTracks[0].artist.name;
						LastFm.GetSimilarTracks(track, function(tracks) {
							if(!tracks) return;
							shuffle(tracks);
							tracks.unshift(artistTracks[0]);
							match(tracks);
						});
					}, 0, 5);
				} if(playlist.tag) {
					LastFm.GetTagTracks(playlist.tag, function(tracks) {
						shuffle(tracks);
						match(tracks);
					});
				} else if(playlist.track) {
					LastFm.GetSimilarTracks(playlist.track, function(tracks) {
						shuffle(tracks);
						match(tracks);
					});
				}
			}

			var response = JSON.parse(JSON.stringify(params));
			response.tracks = JSON.parse(JSON.stringify(playlist.tracks));
			callback(response);
		},
		PlayVideo: function(params) {
			var playlist;
			Playlists.forEach(function(p) {
				if(params.playlist.artist) {
					if(params.playlist.artist.mbid) {
						p.artist && p.artist.mbid && p.artist.mbid === params.playlist.artist.mbid && (playlist = p);
					} else {
						p.artist && !p.artist.mbid && p.artist.name === params.playlist.artist.name && (playlist = p);
					}
				} else if(params.playlist.tag) {
					p.tag && p.tag === params.playlist.tag && (playlist = p);
				} else if(params.playlist.track) {
					if(params.playlist.track.mbid) {
						p.track && p.track.mbid && p.track.mbid === params.playlist.track.mbid && (playlist = p);
					} else {
						p.track && !p.track.mbid && p.track.artist.name === params.playlist.track.artist && p.track.name === params.playlist.track.name && (playlist = p);
					}
				}
			});
			if(!playlist) return;
			Player.playlist = playlist;
			Player.load(params.index);
		},
		NextVideo: function() {
			Player.next();
		},
		PrevVideo: function() {
			Player.prev();
		},
		GetCurrentPlaylistPath: function(params, callback) {
			if(!Player.playlist) return callback();
			if(Player.playlist.tag) callback('tag/' + Player.playlist.tag);
			else if(Player.playlist.artist) {
				var artist = {name: Player.playlist.artist.name};
				Player.playlist.artist.mbid && (artist.mbid = Player.playlist.artist.mbid);
				callback('artist/' + encodeURIComponent(JSON.stringify(artist)));
			} else if(Player.playlist.track) {
				var track = {name: Player.playlist.track.name};
				if(Player.playlist.track.mbid) track.mbid = Player.playlist.track.mbid
				else track.artist = Player.playlist.track.artist.name;
				callback('track/' + encodeURIComponent(JSON.stringify(track)));
			}
		},
		ShowPlayer: function() {
			if(!Player.tab) return;
			chrome.tabs.update(Player.tab.id, {selected: true});
		},
		GetArtists: function(params, callback) {
			LastFm.GetArtists(params.query, callback);
		},
		Subscribe: function(params, callback) {
			var id = Subscriptions.add(params.handler);
			callback(id);
			setTimeout(function() {
				Subscriptions.send(id, 'playing', Player.playing);
			}, 0);
		},
		Unsubscribe: function(params) {
			Subscriptions.remove(params.id);
		}
	};
}());
