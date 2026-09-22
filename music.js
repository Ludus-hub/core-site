(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const state = {
    queue: [], index: -1, queueMode: 'collection', radioRequest: 0,
    history: load('ludus_music_history', []), likes: load('ludus_music_likes', []),
    playlists: load('ludus_music_playlists', []), view: 'home', route: null, backStack: [], forwardStack: [],
    shuffle: load('ludus_music_shuffle', false), repeat: load('ludus_music_repeat', 'off'),
    resolver: localStorage.getItem('ludus_music_resolver_url') || localStorage.getItem('ludusyt_stream_relay_url') || 'https://tokyo-suspended-sorts-prot.trycloudflare.com/resolve'
  };
  const audio = $('#audio');
  const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const normal = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const trackKey = song => normal(song?.title).replace(/\b(official|music|video|audio|lyrics?|visuali[sz]er|hd|4k|remaster(?:ed)?|explicit)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const duration = seconds => { seconds = Math.round(Number(seconds) || 0); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
  const baseUrl = () => state.resolver.replace(/\/resolve\/?$/, '');
  const searchUrl = query => `${baseUrl()}/search?q=${encodeURIComponent(query)}`;
  const resolveUrl = id => `${state.resolver.replace(/\/+$/, '')}?v=${encodeURIComponent(id)}&type=audio`;
  const videoId = value => String(value || '').match(/(?:v=|youtu\.be\/|youtube\.com\/(?:shorts\/|watch\/))([\w-]{11})/)?.[1] || (/^[\w-]{11}$/.test(String(value || '').trim()) ? String(value).trim() : '');

  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function uniqueBy(items, key) { const seen = new Set(); return items.filter(item => { const value = key(item); if (!value || seen.has(value)) return false; seen.add(value); return true; }); }
  function toast(message) { const el = $('#toast'); if (!el) return; el.textContent = message; el.hidden = false; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 180); }, 2600); }
  function status(message, working = true) { const el = $('#import-status'); if (!el) return; el.textContent = message; el.hidden = false; el.classList.toggle('working', working); }
  function hideStatus() { const el = $('#import-status'); if (el) el.hidden = true; }

  function resolverStatus(online, message) {
    const el = $('#resolver-status'); el.classList.toggle('online', online); el.innerHTML = `<i></i>${safe(message)}`;
  }
  async function checkResolver() {
    try { const response = await fetch(`${baseUrl()}/health`, { signal: AbortSignal.timeout(3500) }); if (!response.ok) throw new Error(); resolverStatus(true, 'Music relay connected'); }
    catch { resolverStatus(false, 'Start the local music relay'); }
  }
  async function search(query) {
    const response = await fetch(searchUrl(query), { signal: AbortSignal.timeout(30000) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Music search unavailable');
    return Array.isArray(data.results) ? data.results.filter(item => item?.videoId) : [];
  }

  function art(song) { return song.thumbnail ? `<img src="${safe(song.thumbnail)}" alt="" loading="lazy">` : '♫'; }
  function albumName(song) { return song.album || String(song.title || '').replace(/\s*\([^)]*\)|\s*\[[^\]]*\]/g, '').trim() || 'Untitled album'; }
  function card(song) { return `<article class="card" data-id="${safe(song.videoId)}"><div class="cover">${art(song)}</div><b>${safe(song.title)}</b><span>${safe(song.artist)}</span></article>`; }
  function albumCard(song) { const album = albumName(song); return `<article class="card album-card" data-album="${safe(album)}" data-artist="${safe(song.artist)}" data-cover="${safe(song.thumbnail)}"><div class="cover">${art(song)}</div><b>${safe(album)}</b><span>${safe(song.artist)} · Album</span></article>`; }
  function artistCard(song) { return `<article class="card artist-card" data-artist="${safe(song.artist)}" data-cover="${safe(song.thumbnail)}"><div class="cover artist-cover">${art(song)}</div><b>${safe(song.artist)}</b><span>Artist</span></article>`; }
  function songRow(song, number, insideAlbum = false, playlistId = '', editablePlaylistId = '') {
    const liked = state.likes.some(item => item.videoId === song.videoId);
    const playlistButton = playlistId ? `<button data-action="playlist" data-playlist="${safe(playlistId)}" title="Add to this playlist">＋</button>` : '';
    const removeButton = editablePlaylistId ? `<button data-action="remove-playlist" data-playlist="${safe(editablePlaylistId)}" title="Remove from playlist">×</button>` : '';
    return `<div class="song${insideAlbum ? ' compact' : ''}" data-id="${safe(song.videoId)}"><span class="song-num">${number || '♪'}</span>${insideAlbum ? '' : `<img class="song-art" src="${safe(song.thumbnail)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`}<div class="song-title"><b>${safe(song.title)}</b><span>${safe(song.artist)}</span></div><span class="song-album">${safe(song.album || 'YouTube Music')}</span><span class="song-time">${duration(song.duration)}</span><div class="track-actions"><button data-action="next" class="play-next" title="Play next">⏭</button><button data-action="like" class="${liked ? 'liked' : ''}" title="Like">${liked ? '♥' : '♡'}</button><button data-action="library" title="Add to library">▣</button>${playlistButton}${removeButton}</div></div>`;
  }
  function bindSongs(songs, mode = 'radio') {
    document.querySelectorAll('.card[data-id],.song[data-id]').forEach(element => element.addEventListener('click', event => {
      const song = songs.find(item => item.videoId === element.dataset.id); if (!song) return;
      const button = event.target.closest('button'); const action = button?.dataset.action;
      if (action === 'like') return toggleLike(song, button);
      if (action === 'library') return addToLibrary(song);
      if (action === 'playlist') return addToPlaylist(button.dataset.playlist, song, button);
      if (action === 'remove-playlist') return removeFromPlaylist(button.dataset.playlist, song);
      if (action === 'next') return queueNext(song);
      mode === 'collection' ? playList(songs, songs.indexOf(song)) : playSingle(song);
    }));
  }
  function bindAlbumsAndArtists() {
    document.querySelectorAll('[data-album]').forEach(element => element.onclick = () => go({ type: 'album', album: element.dataset.album, artist: element.dataset.artist, cover: element.dataset.cover }));
    document.querySelectorAll('.artist-card[data-artist]').forEach(element => element.onclick = () => go({ type: 'artist', artist: element.dataset.artist, cover: element.dataset.cover }));
  }

  async function renderHome() {
    $('#view').innerHTML = `<section class="hero"><div class="eyebrow">YOUR STREAMING DESKTOP</div><h1>Music that stays in Ludus.</h1><p>Search, save, and keep a listening queue through the same local relay you already use for video.</p><div class="hero-actions"><button id="hero-search">Search music</button><button class="ghost" id="hero-library">Open library</button></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">DISCOVER</span><h2>Popular right now</h2></div></div><div class="cards" id="popular"><div class="empty">Loading music…</div></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">EXPLORE</span><h2>Albums & artists</h2></div><button class="text-action" id="browse-albums">Browse</button></div><div class="cards" id="albums"></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">FOR YOU</span><h2>Continue discovering</h2></div><button class="text-action" id="refresh-mix">Refresh</button></div><div class="cards" id="mix"></div></section>`;
    $('#hero-search').onclick = () => { navigate('search'); $('#search-input').focus(); };
    $('#hero-library').onclick = () => navigate('library');
    try {
      const [popular, albums, mix] = await Promise.all([search('popular music official audio'), search('new music album official'), search(state.history[0]?.artist || 'new music official audio')]);
      $('#popular').innerHTML = popular.slice(0, 8).map(card).join('');
      $('#albums').innerHTML = albums.slice(0, 8).map(albumCard).join('');
      $('#mix').innerHTML = mix.slice(0, 8).map(card).join('');
      bindSongs([...popular, ...mix], 'radio'); bindAlbumsAndArtists();
      $('#refresh-mix').onclick = renderHome;
      $('#browse-albums').onclick = () => { $('#search-input').value = 'album'; go({ type: 'search', query: 'album' }); };
    } catch (error) { $('#popular').innerHTML = `<div class="empty"><h2>Relay unavailable</h2>${safe(error.message)}<br><br>Keep the resolver and tunnel running.</div>`; }
  }

  async function renderSearch(query = '') {
    $('#view').innerHTML = `<section class="search-hero"><div class="eyebrow">SEARCH</div><h1>${query ? `Results for “${safe(query)}”` : 'Find your next song'}</h1><p>${query ? 'Songs, artists, and albums from your local relay.' : 'Try an artist, track, album, or a mood.'}</p></section><section class="section" id="search-song-section"><div class="section-head"><div><span class="section-kicker">SONGS</span><h2>Tracks</h2></div></div><div class="song-list" id="search-songs">${query ? '<div class="empty">Searching…</div>' : '<div class="empty">Use the search bar to find music.</div>'}</div></section><section class="section search-groups" id="search-artist-section" hidden><div class="section-head"><div><span class="section-kicker">ARTISTS</span><h2>Artists</h2></div></div><div class="cards" id="search-artists"></div></section><section class="section search-groups" id="search-album-section" hidden><div class="section-head"><div><span class="section-kicker">ALBUMS</span><h2>Albums</h2></div></div><div class="cards" id="search-albums"></div></section>`;
    if (!query) return;
    try {
      const results = await search(`${query} music`);
      const songs = results.slice(0, 12);
      const artists = uniqueBy(results.filter(song => song.artist && song.artist !== 'YouTube'), song => normal(song.artist)).slice(0, 7);
      const albums = uniqueBy(results, song => `${normal(song.artist)}|${normal(albumName(song))}`).slice(0, 7);
      $('#search-songs').innerHTML = songs.map((song, index) => songRow(song, index + 1)).join('') || '<div class="empty">No songs found.</div>';
      $('#search-artists').innerHTML = artists.map(artistCard).join('');
      $('#search-albums').innerHTML = albums.map(albumCard).join('');
      $('#search-artist-section').hidden = !artists.length; $('#search-album-section').hidden = !albums.length;
      bindSongs(songs, 'radio'); bindAlbumsAndArtists();
    } catch (error) { $('#search-songs').innerHTML = `<div class="empty">${safe(error.message)}</div>`; }
  }

  function renderLibrary() {
    const liked = state.likes;
    $('#view').innerHTML = `<section class="search-hero"><div class="eyebrow">YOUR LIBRARY</div><h1>Your saved music</h1><p>Likes and playlists are stored in this browser.</p></section><section class="section"><div class="section-head"><div><span class="section-kicker">LIKED SONGS</span><h2>Favorites</h2></div></div><div class="song-list">${liked.length ? liked.map((song, index) => songRow(song, index + 1)).join('') : '<div class="empty">Like a song while it is playing to save it here.</div>'}</div></section><section class="section"><div class="section-head"><div><span class="section-kicker">PLAYLISTS</span><h2>Your playlists</h2></div><button class="text-action" id="library-new-playlist">New playlist</button></div><div class="cards">${state.playlists.map(playlist => `<article class="card playlist-card" data-playlist="${safe(playlist.id)}"><div class="cover">☷</div><b>${safe(playlist.name)}</b><span>${playlist.songs.length} songs</span></article>`).join('') || '<div class="empty">Create a playlist or import a CSV.</div>'}</div></section>`;
    bindSongs(liked, 'radio');
    document.querySelectorAll('[data-playlist]').forEach(element => element.onclick = () => go({ type: 'playlist', id: element.dataset.playlist }));
    $('#library-new-playlist').onclick = createPlaylist;
  }

  function renderPlaylist(id) {
    const playlist = state.playlists.find(item => item.id === id); if (!playlist) return renderLibrary();
    $('#view').innerHTML = `<section class="playlist-hero"><div class="playlist-art">☷</div><div><div class="eyebrow">PLAYLIST</div><h1>${safe(playlist.name)}</h1><p id="playlist-count">${playlist.songs.length} song${playlist.songs.length === 1 ? '' : 's'} · saved in this browser</p><div class="hero-actions"><button id="play-playlist">▶ Play</button><button id="shuffle-playlist">⤨ Shuffle play</button><button class="ghost" id="open-playlist-add">＋ Add songs</button><button class="ghost" id="rename-playlist">Rename</button></div></div></section><section class="playlist-editor" id="playlist-editor" hidden><div><span class="section-kicker">ADD TO ${safe(playlist.name)}</span><h2>Search to add songs</h2></div><form id="playlist-search-form"><input id="playlist-search-input" placeholder="Artist or song name" autocomplete="off"><button>Add search</button></form><div class="song-list" id="playlist-search-results"><div class="empty">Search a track, then press ＋ on it to add it.</div></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">TRACKS</span><h2>Playlist</h2></div><button class="text-action danger" id="delete-playlist">Delete</button></div><div class="song-list">${playlist.songs.length ? playlist.songs.map((song, index) => songRow(song, index + 1, false, '', playlist.id)).join('') : '<div class="empty">This playlist is empty. Use Add songs to search and build it.</div>'}</div></section>`;
    bindSongs(playlist.songs, 'collection');
    $('#play-playlist').onclick = () => playlist.songs.length ? playList(playlist.songs, 0) : toast('Add a song first.');
    $('#shuffle-playlist').onclick = () => playlist.songs.length ? playList(shuffled(playlist.songs), 0) : toast('Add a song first.');
    $('#open-playlist-add').onclick = () => { const editor = $('#playlist-editor'); editor.hidden = !editor.hidden; if (!editor.hidden) $('#playlist-search-input').focus(); };
    $('#playlist-search-form').onsubmit = async event => {
      event.preventDefault(); const query = $('#playlist-search-input').value.trim(); if (!query) return;
      $('#playlist-search-results').innerHTML = '<div class="empty">Searching music…</div>';
      try { const songs = await search(query); $('#playlist-search-results').innerHTML = songs.map((song, index) => songRow(song, index + 1, false, playlist.id)).join('') || '<div class="empty">No results found.</div>'; bindSongs(songs, 'radio'); }
      catch (error) { $('#playlist-search-results').innerHTML = `<div class="empty">${safe(error.message)}</div>`; }
    };
    $('#rename-playlist').onclick = () => renamePlaylist(id);
    $('#delete-playlist').onclick = () => { if (!confirm(`Delete “${playlist.name}”?`)) return; state.playlists = state.playlists.filter(item => item.id !== id); save('ludus_music_playlists', state.playlists); renderPlaylists(); go({ type: 'library' }); toast('Playlist deleted.'); };
  }

  async function renderAlbum(album, artist, cover) {
    $('#view').innerHTML = `<section class="album-hero"><img class="album-cover" src="${safe(cover)}" alt="" onerror="this.style.display='none'"><div class="album-copy"><div class="eyebrow">ALBUM</div><h1>${safe(album)}</h1><p class="artist-line">${safe(artist)}</p><p>Tracks are matched through your local music relay.</p><button class="artist-chip" id="album-artist">♬ ${safe(artist)}</button><br><button id="album-play" class="album-play">▶ Play album</button></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">TRACKS</span><h2>Album tracks</h2></div></div><div class="song-list" id="album-tracks"><div class="empty">Loading album tracks…</div></div></section>`;
    $('#album-artist').onclick = () => go({ type: 'artist', artist, cover });
    try { const tracks = (await search(`${artist} ${album} full album`)).map(song => ({ ...song, album })); $('#album-tracks').innerHTML = tracks.map((song, index) => songRow(song, index + 1, true)).join('') || '<div class="empty">No tracks found.</div>'; bindSongs(tracks, 'collection'); $('#album-play').onclick = () => tracks.length && playList(tracks, 0); }
    catch (error) { $('#album-tracks').innerHTML = `<div class="empty">${safe(error.message)}</div>`; }
  }

  async function renderArtist(artist, cover = '') {
    $('#view').innerHTML = `<section class="album-hero artist-page"><img class="album-cover" src="${safe(cover)}" alt="" onerror="this.style.display='none'"><div class="album-copy"><div class="eyebrow">ARTIST</div><h1>${safe(artist)}</h1><p class="artist-line">Artist page powered by your local music relay.</p><button id="artist-play" class="album-play">▶ Play popular</button></div></section><section class="section"><div class="section-head"><div><span class="section-kicker">POPULAR</span><h2>Top tracks</h2></div></div><div class="song-list" id="artist-tracks"><div class="empty">Loading artist…</div></div></section>`;
    try { const tracks = await search(`${artist} official audio`); $('#artist-tracks').innerHTML = tracks.map((song, index) => songRow(song, index + 1)).join('') || '<div class="empty">No tracks found.</div>'; bindSongs(tracks, 'collection'); $('#artist-play').onclick = () => tracks.length && playList(tracks, 0); }
    catch (error) { $('#artist-tracks').innerHTML = `<div class="empty">${safe(error.message)}</div>`; }
  }

  async function playList(songs, index = 0) { state.radioRequest++; state.queue = songs.slice(); state.index = index; state.queueMode = 'collection'; renderQueue(); await playCurrent(); }
  async function playSingle(song) { const request = ++state.radioRequest; state.queue = [song]; state.index = 0; state.queueMode = 'radio'; renderQueue(); const playback = playCurrent(); findSimilarSongs(song, request); await playback; }
  async function findSimilarSongs(seed, request) {
    try {
      const artistQuery = seed.artist && seed.artist !== 'YouTube' ? `${seed.artist} popular songs official audio` : `${seed.title} music discovery official audio`;
      const [artistResults, discoveryResults] = await Promise.all([search(artistQuery), search('popular music official audio')]);
      if (state.radioRequest !== request || state.queueMode !== 'radio' || state.queue[0]?.videoId !== seed.videoId) return;
      const seedKey = trackKey(seed); const seen = new Set([seed.videoId]);
      const similar = [...artistResults, ...discoveryResults].filter(song => {
        const candidateKey = trackKey(song); const sameTitle = Boolean(seedKey) && (candidateKey === seedKey || candidateKey.includes(seedKey) || seedKey.includes(candidateKey)); if (!song.videoId || seen.has(song.videoId) || !candidateKey || sameTitle) return false;
        seen.add(song.videoId); return true;
      }).slice(0, 18);
      state.queue = [seed, ...similar]; renderQueue();
      toast(similar.length ? `${similar.length} similar songs added to your queue.` : 'No similar tracks found.');
    } catch { if (state.radioRequest === request) renderQueue(); }
  }
  async function playCurrent() {
    const song = state.queue[state.index]; if (!song) return;
    $('#now-title').textContent = song.title; $('#now-artist').textContent = song.artist;
    const image = $('#now-art'); image.src = song.thumbnail || ''; image.hidden = !song.thumbnail; $('#now-placeholder').hidden = Boolean(song.thumbnail);
    $('#like').textContent = state.likes.some(item => item.videoId === song.videoId) ? '♥' : '♡';
    try {
      $('#play').textContent = '…'; const response = await fetch(resolveUrl(song.videoId), { signal: AbortSignal.timeout(30000) }); const data = await response.json().catch(() => ({}));
      const stream = (data.adaptiveFormats || []).filter(item => String(item.type).startsWith('audio/mp4')).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!response.ok || !stream?.url) throw new Error(data.error || 'No playable audio stream');
      audio.src = stream.url; await audio.play(); state.history = [song, ...state.history.filter(item => item.videoId !== song.videoId)].slice(0, 20); save('ludus_music_history', state.history); $('#play').textContent = '❚❚'; renderQueue();
    } catch (error) { $('#play').textContent = '▶'; toast(`Could not play this song: ${error.message}`); }
  }
  function toggleLike(song, button) { const index = state.likes.findIndex(item => item.videoId === song.videoId); if (index >= 0) state.likes.splice(index, 1); else state.likes.unshift(song); save('ludus_music_likes', state.likes); if (button) { button.classList.toggle('liked', index < 0); button.textContent = index < 0 ? '♥' : '♡'; } if (state.view === 'library') renderLibrary(); }
  function addToLibrary(song) { let library = state.playlists.find(item => item.id === 'ludus-library'); if (!library) { library = { id: 'ludus-library', name: 'My Library', songs: [] }; state.playlists.unshift(library); } const exists = library.songs.some(item => item.videoId === song.videoId); if (!exists) library.songs.push(song); save('ludus_music_playlists', state.playlists); renderPlaylists(); toast(exists ? 'Already in My Library.' : 'Added to My Library.'); }
  function addToPlaylist(id, song, button) { const playlist = state.playlists.find(item => item.id === id); if (!playlist) return; const exists = playlist.songs.some(item => item.videoId === song.videoId); if (!exists) playlist.songs.push(song); save('ludus_music_playlists', state.playlists); renderPlaylists(); if (button) { button.textContent = exists ? '✓' : '✓'; button.disabled = true; } const count = $('#playlist-count'); if (count) count.textContent = `${playlist.songs.length} song${playlist.songs.length === 1 ? '' : 's'} · saved in this browser`; toast(exists ? 'That song is already in this playlist.' : `Added to ${playlist.name}.`); }
  function removeFromPlaylist(id, song) { const playlist = state.playlists.find(item => item.id === id); if (!playlist) return; playlist.songs = playlist.songs.filter(item => item.videoId !== song.videoId); save('ludus_music_playlists', state.playlists); renderPlaylists(); renderPlaylist(id); toast(`Removed “${song.title}”.`); }
  function renamePlaylist(id) { const playlist = state.playlists.find(item => item.id === id); if (!playlist) return; const name = prompt('Playlist name', playlist.name); if (!name?.trim() || name.trim() === playlist.name) return; playlist.name = name.trim(); save('ludus_music_playlists', state.playlists); renderPlaylists(); renderPlaylist(id); toast('Playlist renamed.'); }
  function shuffled(items) { const copy = items.slice(); for (let index = copy.length - 1; index > 0; index--) { const other = Math.floor(Math.random() * (index + 1)); [copy[index], copy[other]] = [copy[other], copy[index]]; } return copy; }
  function queueNext(song) { if (state.index < 0 || !state.queue.length) return playSingle(song); const playing = state.queue[state.index]; state.queue = state.queue.filter(item => item.videoId !== song.videoId); const playingIndex = state.queue.indexOf(playing); state.queue.splice(playingIndex + 1, 0, song); state.index = state.queue.indexOf(playing); renderQueue(); toast(`“${song.title}” will play next.`); }
  function renderQueue() {
    const pending = state.queueMode === 'radio' && state.queue.length === 1 ? '<div class="queue-pending">Finding similar songs…</div>' : '';
    $('#queue-items').innerHTML = state.queue.map((song, index) => `<div class="queue-item ${index === state.index ? 'current' : ''}" data-index="${index}"><img src="${safe(song.thumbnail)}" alt="" onerror="this.style.visibility='hidden'"><div><b>${safe(song.title)}</b><small>${safe(song.artist)}</small></div><div class="queue-actions"><button data-move="-1" title="Move up" ${index === 0 ? 'disabled' : ''}>↑</button><button data-move="1" title="Move down" ${index === state.queue.length - 1 ? 'disabled' : ''}>↓</button><button data-remove="${index}" title="Remove from queue">×</button></div></div>`).join('') + pending || '<div class="empty">Queue is empty</div>';
    document.querySelectorAll('.queue-item').forEach(element => element.onclick = event => { const remove = event.target.closest('[data-remove]'); if (remove) return removeQueue(Number(remove.dataset.remove)); const move = event.target.closest('[data-move]'); if (move) return moveQueueItem(Number(element.dataset.index), Number(move.dataset.move)); const index = Number(element.dataset.index); if (index !== state.index) { state.index = index; playCurrent(); } });
  }
  function removeQueue(index) { if (index < 0 || index >= state.queue.length) return; if (state.queue.length === 1) { state.queue = []; state.index = -1; } else { state.queue.splice(index, 1); if (index < state.index) state.index--; else if (index === state.index) state.index = Math.min(state.index, state.queue.length - 1); } renderQueue(); }
  function moveQueueItem(index, offset) { const target = index + offset; if (target < 0 || target >= state.queue.length) return; const playing = state.queue[state.index]; [state.queue[index], state.queue[target]] = [state.queue[target], state.queue[index]]; state.index = state.queue.indexOf(playing); renderQueue(); }
  function seekBy(seconds) { if (!Number.isFinite(audio.duration)) return; audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds)); postMusicState(); }
  function next(step = 1) {
    if (!state.queue.length) return;
    if (state.repeat === 'one' && step > 0) { audio.currentTime = 0; audio.play(); return; }
    if (state.queueMode === 'radio' && state.queue.length === 1) { toast('Still finding similar songs…'); return; }
    if (state.shuffle && state.queue.length > 1) { let candidate = state.index; while (candidate === state.index) candidate = Math.floor(Math.random() * state.queue.length); state.index = candidate; }
    else { const nextIndex = state.index + step; if (nextIndex < 0) state.index = state.repeat === 'all' ? state.queue.length - 1 : 0; else if (nextIndex >= state.queue.length) { if (state.repeat === 'all') state.index = 0; else { state.index = state.queue.length - 1; audio.pause(); return; } } else state.index = nextIndex; }
    playCurrent();
  }
  function postMusicState() { if (window.parent === window) return; const song = state.queue[state.index] || {}; window.parent.postMessage({ source: 'music', title: song.title || 'Ludus Music', artist: song.artist || 'Ludus Music', artwork: song.thumbnail || '', paused: audio.paused, volume: audio.volume, currentTime: audio.currentTime || 0, duration: audio.duration || 0 }, '*'); }

  function parseCsv(text) { const rows = []; let row = [], cell = '', quoted = false; for (let i = 0; i < text.length; i++) { const char = text[i], next = text[i + 1]; if (char === '"' && quoted && next === '"') { cell += '"'; i++; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; } else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ''; } else cell += char; } row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows; }
  function csvRows(text) {
    const rows = parseCsv(text); if (!rows.length) return [];
    const firstRow = rows.shift(); const rawHeaders = firstRow.map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
    const known = ['videoid', 'video_id', 'youtubeid', 'youtube_id', 'url', 'youtube_url', 'link', 'title', 'name', 'track', 'track name', 'song', 'song name', 'artist', 'artist name', 'artists', 'album', 'album name'];
    const hasHeaders = rawHeaders.some(value => known.includes(value)); const headers = hasHeaders ? rawHeaders : ['title', 'artist', 'album']; const dataRows = hasHeaders ? rows : [firstRow, ...rows];
    const at = (...names) => names.map(name => headers.indexOf(name)).find(index => index >= 0);
    const valueAt = (row, ...names) => { const index = at(...names); return index === undefined ? '' : row[index] || ''; };
    return dataRows.map(row => {
      const rawId = valueAt(row, 'videoid', 'video_id', 'youtubeid', 'youtube_id', 'url', 'youtube_url', 'link') || row.find(value => videoId(value)) || '';
      return { videoId: videoId(rawId), title: valueAt(row, 'title', 'name', 'track', 'track name', 'song', 'song name'), artist: valueAt(row, 'artist', 'artist name', 'artists', 'creator', 'channel'), album: valueAt(row, 'album', 'album name') };
    }).filter(song => song.videoId || song.title);
  }
  function chooseCsvMatch(candidate, results) {
    const title = normal(candidate.title); const artist = normal(candidate.artist);
    const score = result => { const resultTitle = normal(result.title); const resultArtist = normal(result.artist); return (title && (resultTitle.includes(title) || title.includes(resultTitle)) ? 6 : 0) + (artist && (resultArtist.includes(artist) || artist.includes(resultArtist)) ? 4 : 0) + (String(result.title || '').toLowerCase().includes('official') ? 1 : 0); };
    return results.slice().sort((a, b) => score(b) - score(a))[0];
  }
  async function importCsv(file) {
    let text; try { text = await file.text(); } catch { toast('Could not read that CSV.'); return; }
    const rows = csvRows(text); if (!rows.length) { toast('No song titles or YouTube links were found in that CSV.'); return; }
    status(`Preparing ${rows.length} song${rows.length === 1 ? '' : 's'}…`);
    const songs = []; let matched = 0;
    for (let index = 0; index < rows.length; index++) {
      const candidate = rows[index]; status(`Matching ${index + 1} of ${rows.length}: ${candidate.title || 'YouTube link'}`);
      if (candidate.videoId) { songs.push({ ...candidate, title: candidate.title || 'Imported song', artist: candidate.artist || 'Unknown artist', duration: 0, thumbnail: '' }); matched++; continue; }
      try { const query = [candidate.artist, candidate.title, candidate.album, 'official audio'].filter(Boolean).join(' '); const match = chooseCsvMatch(candidate, await search(query)); if (match) { songs.push({ ...match, album: candidate.album || match.album || '', title: match.title || candidate.title, artist: match.artist || candidate.artist }); matched++; } }
      catch { /* A single unavailable track should not cancel the playlist. */ }
    }
    hideStatus();
    if (!songs.length) { toast('No tracks could be matched. Check that the relay is running, then try again.'); return; }
    const id = crypto.randomUUID?.() || `playlist-${Date.now()}`; const name = file.name.replace(/\.csv$/i, '') || 'Imported playlist'; state.playlists.push({ id, name, songs }); save('ludus_music_playlists', state.playlists); renderPlaylists(); go({ type: 'playlist', id }); toast(`Imported ${matched} of ${rows.length} tracks.`);
  }

  function renderPlaylists() { $('#playlist-list').innerHTML = state.playlists.map(item => `<button class="playlist" data-playlist="${safe(item.id)}">${safe(item.name)}</button>`).join(''); document.querySelectorAll('#playlist-list .playlist').forEach(element => element.onclick = () => go({ type: 'playlist', id: element.dataset.playlist })); }
  function createPlaylist() { const name = prompt('Playlist name'); if (!name?.trim()) return; const id = crypto.randomUUID?.() || `playlist-${Date.now()}`; state.playlists.push({ id, name: name.trim(), songs: [] }); save('ludus_music_playlists', state.playlists); renderPlaylists(); go({ type: 'playlist', id }); toast('Playlist created. Search to add songs.'); }
  function routesMatch(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function updateHistoryButtons() { $('#back').disabled = !state.backStack.length; $('#forward').disabled = !state.forwardStack.length; }
  function renderRoute(route) {
    state.view = route.type; document.querySelectorAll('.nav').forEach(button => button.classList.toggle('active', button.dataset.view === route.type));
    if (route.type === 'home') renderHome(); else if (route.type === 'search') { $('#search-input').value = route.query || ''; renderSearch(route.query || ''); } else if (route.type === 'library') renderLibrary(); else if (route.type === 'playlist') renderPlaylist(route.id); else if (route.type === 'album') renderAlbum(route.album, route.artist, route.cover); else if (route.type === 'artist') renderArtist(route.artist, route.cover);
    updateHistoryButtons();
  }
  function go(route, addHistory = true) { if (state.route && routesMatch(state.route, route)) return; if (addHistory && state.route) { state.backStack.push(state.route); state.forwardStack = []; } state.route = route; renderRoute(route); }
  function goBack() { if (!state.backStack.length) return; state.forwardStack.push(state.route); state.route = state.backStack.pop(); renderRoute(state.route); }
  function goForward() { if (!state.forwardStack.length) return; state.backStack.push(state.route); state.route = state.forwardStack.pop(); renderRoute(state.route); }
  function navigate(view) { go({ type: view }); }

  document.querySelectorAll('.nav').forEach(button => button.onclick = () => navigate(button.dataset.view));
  $('#search-form').onsubmit = event => { event.preventDefault(); const query = $('#search-input').value.trim(); go({ type: 'search', query }); };
  $('#back').onclick = goBack; $('#forward').onclick = goForward;
  $('#play').onclick = () => audio.paused ? (audio.src ? audio.play() : playCurrent()) : audio.pause(); $('#previous').onclick = () => next(-1); $('#next').onclick = () => next(1); $('#back-10').onclick = () => seekBy(-10); $('#forward-10').onclick = () => seekBy(10);
  $('#shuffle').onclick = () => { state.shuffle = !state.shuffle; save('ludus_music_shuffle', state.shuffle); $('#shuffle').classList.toggle('active', state.shuffle); toast(state.shuffle ? 'Shuffle is on.' : 'Shuffle is off.'); };
  $('#repeat').onclick = () => { state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off'; save('ludus_music_repeat', state.repeat); $('#repeat').classList.toggle('active', state.repeat !== 'off'); $('#repeat').textContent = state.repeat === 'one' ? '↻¹' : '↻'; toast(`Repeat ${state.repeat === 'off' ? 'off' : state.repeat === 'one' ? 'one song' : 'all'}.`); };
  $('#shuffle').classList.toggle('active', state.shuffle); $('#repeat').classList.toggle('active', state.repeat !== 'off'); if (state.repeat === 'one') $('#repeat').textContent = '↻¹';
  audio.onplay = () => { $('#play').textContent = '❚❚'; postMusicState(); }; audio.onpause = () => { $('#play').textContent = '▶'; postMusicState(); }; audio.onended = () => next(1); audio.ontimeupdate = () => { $('#elapsed').textContent = duration(audio.currentTime); $('#duration').textContent = duration(audio.duration); if (!$('#progress').matches(':active')) $('#progress').value = audio.duration ? audio.currentTime / audio.duration * 1000 : 0; postMusicState(); };
  $('#progress').oninput = () => { if (audio.duration) audio.currentTime = audio.duration * $('#progress').value / 1000; }; $('#volume').oninput = () => { audio.volume = $('#volume').value; postMusicState(); }; audio.volume = $('#volume').value;
  $('#mute').onclick = () => { audio.muted = !audio.muted; $('#mute').textContent = audio.muted ? '×' : '◖'; }; $('#like').onclick = () => { const song = state.queue[state.index]; if (!song) return; toggleLike(song); $('#like').textContent = state.likes.some(item => item.videoId === song.videoId) ? '♥' : '♡'; };
  $('#queue-toggle').onclick = () => $('#queue').hidden = !$('#queue').hidden; $('#close-queue').onclick = () => $('#queue').hidden = true; $('#csv-input').onchange = event => { const file = event.target.files[0]; if (file) importCsv(file); event.target.value = ''; };
  $('#new-playlist').onclick = createPlaylist;
  $('#resolver-settings').onclick = () => { $('#resolver-input').value = state.resolver; $('#resolver-dialog').showModal(); }; $('#save-resolver').onclick = () => { state.resolver = $('#resolver-input').value.trim().replace(/\/+$/, ''); localStorage.setItem('ludus_music_resolver_url', state.resolver); checkResolver(); };
  window.addEventListener('message', event => { const data = event.data || {}; if (data.target !== 'music') return; if (data.action === 'togglePlay') audio.paused ? (audio.src ? audio.play() : playCurrent()) : audio.pause(); if (data.action === 'playNext') next(1); if (data.action === 'playPrev') next(-1); if (data.action === 'setVolume') { audio.volume = Math.max(0, Math.min(1, Number(data.volume))); $('#volume').value = audio.volume; } postMusicState(); });
  renderPlaylists(); checkResolver(); go({ type: 'home' }, false);
})();
