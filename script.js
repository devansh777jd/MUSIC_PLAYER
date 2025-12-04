// -----------------------------
// MASTER SONGS (with categories)
// -----------------------------
const masterSongs = [
    { id: "Kok4yyWMbSg", title:  "Junoon", category: "Chill" },
    { id: "TQsEuHaduds", title: "O re saavan", category: "Study" },
    { id: "9aOgTYO5UKs", title: "Soulmate", category: "Chill" },
    { id: "BGSmRmIv5ws", title: "Ranjheya ve", category: "Trap" },
    { id: "XBVx8R5oGys", title: " MITRAZ Janeya" , category: "Study" },
     { id: "k6q4lENp434", title: " Preet Re",category: "Study" },
     { id: "YXhRJyKGgAM", title: "Mitraz 28min",category: "Study" },
     {id: "JVfLPrSZkB4", title: "Mitraz Mashup", category: "Study" },
    
];

// Keep the existing playback logic intact by exposing `songs` as the active list.
// Functions like loadSong / nextSong / prevSong operate on `songs`.
let songs = [...masterSongs]; // active playlist (default = all)
let currentIndex = 0;

let player = null;
let playerReady = false;
let isShuffle = false;
let progressTimer = null;
let isSeeking = false;


// ------------------------------------------------------------
// YOUTUBE IFRAME API LOAD
// ------------------------------------------------------------
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);


// ------------------------------------------------------------
// UTIL: build thumbnail URL from YouTube ID (option A)
function thumbFor(id) {
    // high quality thumbnail (works for most youtube vids)
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

// time formatting
function fmtTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}


// ------------------------------------------------------------
// YOUTUBE API READY -> CREATE PLAYER
// ------------------------------------------------------------
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player-container", {
        height: "0",
        width: "0",
        videoId: songs[currentIndex].id,  // load the first song
        playerVars: {
            autoplay: 0,
            loop: 1,
            playlist: songs[currentIndex].id
        },
        events: {
            onReady: () => {
                playerReady = true;
                player.setVolume(50);
                initUI();
                updateNowPlayingUI();
                renderQueue();
                startProgressLoop();
                console.log("YouTube Player Ready");
            },
            onStateChange: (e) => {
                // If track ends (YT state 0), automatically move to next
                if (e.data === YT.PlayerState.ENDED) {
                    // keep same behavior as original next logic
                    nextSong();
                }
            }
        }
    });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;


// ------------------------------------------------------------
// UI ELEMENTS
const elNowTitle = () => document.getElementById("nowTitle");
const elNowSubtitle = () => document.getElementById("nowSubtitle");
const elAlbumArt = () => document.querySelector("#albumArt img");
const elCategoryLabel = () => document.getElementById("categoryLabel");
const elProgressFill = () => document.getElementById("progressBarFill");
const elCurrentTime = () => document.getElementById("currentTime");
const elDurationTime = () => document.getElementById("durationTime");
const elQueue = () => document.getElementById("queue");
const elVolume = () => document.getElementById("volumeSlider");
const elVolVal = () => document.getElementById("volVal");
const elShuffleBtn = () => document.getElementById("shuffleBtn");
const elShuffleToggle = () => document.getElementById("shuffleToggle");
const elCategorySelect = () => document.getElementById("categorySelect");


// ------------------------------------------------------------
// INITIAL UI SETUP
function initUI() {
    // volume control
    elVolume().addEventListener("input", (e) => {
        const v = parseInt(e.target.value, 10);
        elVolVal().textContent = `${v}%`;
        if (playerReady) player.setVolume(v);
    });

    // progress seeking
    const progressContainer = document.getElementById("progressBar");
    progressContainer.addEventListener("click", (e) => {
        if (!playerReady) return;
        const rect = progressContainer.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const dur = player.getDuration();
        if (!isNaN(dur) && dur > 0) {
            player.seekTo(dur * pct, true);
            updateProgressImmediate();
        }
    });

    // controls
    document.getElementById("playBtn").onclick = function () {
        if (playerReady) player.playVideo();
    };
    document.getElementById("pauseBtn").onclick = function () {
        if (playerReady) player.pauseVideo();
    };
    document.getElementById("nextBtn").onclick = function () {
        nextSong();
    };
    document.getElementById("prevBtn").onclick = function () {
        prevSong();
    };

    // shuffle buttons
    elShuffleBtn().addEventListener("click", () => {
        isShuffle = !isShuffle;
        elShuffleBtn().style.background = isShuffle ? "rgba(29,185,84,0.95)" : "";
        elShuffleBtn().style.color = isShuffle ? "#061006" : "";
        elShuffleToggle().textContent = `Shuffle: ${isShuffle ? "On" : "Off"}`;
    });
    elShuffleToggle().addEventListener("click", () => {
        isShuffle = !isShuffle;
        elShuffleBtn().style.background = isShuffle ? "rgba(29,185,84,0.95)" : "";
        elShuffleBtn().style.color = isShuffle ? "#061006" : "";
        elShuffleToggle().textContent = `Shuffle: ${isShuffle ? "On" : "Off"}`;
    });

    // categories (playlist selection)
    populateCategories();
    elCategorySelect().addEventListener("change", (e) => {
        applyCategory(e.target.value);
    });
}


// ------------------------------------------------------------
// QUEUE / CATEGORY LOGIC
function uniqueCategories() {
    const set = new Set(masterSongs.map(s => s.category || "Unknown"));
    return ["All", ...Array.from(set)];
}

function populateCategories() {
    const categories = uniqueCategories();
    const sel = elCategorySelect();
    sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
    sel.value = "All";
}

function applyCategory(cat) {
    if (cat === "All") {
        songs = [...masterSongs];
    } else {
        songs = masterSongs.filter(s => s.category === cat);
    }
    // reset index to 0 so user starts at top of category
    currentIndex = 0;
    updateNowPlayingUI();
    renderQueue();
    // load the first song into player but keep playback off (same behavior)
    if (playerReady) {
        player.loadVideoById(songs[currentIndex].id);
        player.setVolume(parseInt(elVolume().value, 10) || 50);
    }
    elCategoryLabel().textContent = `Category: ${cat}`;
}


// ------------------------------------------------------------
// RENDER QUEUE (click-to-play)
function renderQueue() {
    const q = elQueue();
    q.innerHTML = "";
    songs.forEach((s, idx) => {
        const item = document.createElement("div");
        item.className = "queue-item" + (idx === currentIndex ? " active" : "");
        item.innerHTML = `
            <div class="q-art"><img src="${thumbFor(s.id)}" alt="art"/></div>
            <div class="q-meta">
                <div class="q-title">${s.title}</div>
                <div class="q-sub">${s.category || "YouTube"}</div>
            </div>
        `;
        item.addEventListener("click", () => {
            // click-to-play from queue: keep same load logic
            loadSong(idx);
        });
        q.appendChild(item);
    });
}


// ------------------------------------------------------------
// UPDATE NOW PLAYING UI
function updateNowPlayingUI() {
    const s = songs[currentIndex];
    elNowTitle().textContent = s.title;
    elNowSubtitle().textContent = `YouTube • ${s.id}`;
    elAlbumArt().src = thumbFor(s.id);
    elCategoryLabel().textContent = `Category: ${s.category || "All"}`;
    renderQueue();
}


// ------------------------------------------------------------
// PROGRESS LOOP: animated progress bar
function startProgressLoop() {
    stopProgressLoop();
    progressTimer = setInterval(() => {
        updateProgressImmediate();
    }, 500);
}

function stopProgressLoop(){
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function updateProgressImmediate(){
    if (!playerReady) return;
    const dur = player.getDuration();
    const cur = player.getCurrentTime();

    document.getElementById("currentTime").textContent = fmtTime(cur);
    document.getElementById("durationTime").textContent = fmtTime(dur);

    if (dur && dur > 0) {
        const pct = Math.max(0, Math.min(1, cur / dur));
        elProgressFill().style.width = `${pct * 100}%`;
    } else {
        elProgressFill().style.width = `0%`;
    }
}


// ------------------------------------------------------------
// PLAYER CONTROL LOGIC (kept semantics same as original code)
// ------------------------------------------------------------

// Load a song by index (keeps original behavior: loads via video id)
function loadSong(index) {
    currentIndex = index;

    // Change the YouTube video using your logic
    if (playerReady) {
        player.loadVideoById(songs[currentIndex].id);
    }

    // Update UI
    updateNowPlayingUI();

    console.log("Now playing:", songs[currentIndex].title);
}

// Next song (if shuffle ON, pick random, else next in list)
function nextSong() {
    if (isShuffle) {
        // pick random index not equal to currentIndex (if possible)
        if (songs.length <= 1) {
            // nothing to change
        } else {
            let idx;
            do {
                idx = Math.floor(Math.random() * songs.length);
            } while (idx === currentIndex);
            currentIndex = idx;
        }
    } else {
        currentIndex++;
        if (currentIndex >= songs.length) currentIndex = 0;
    }

    loadSong(currentIndex);
}

// Prev song (if shuffle ON, pick random, else previous in list)
function prevSong() {
    if (isShuffle) {
        if (songs.length <= 1) {
            // nothing
        } else {
            let idx;
            do {
                idx = Math.floor(Math.random() * songs.length);
            } while (idx === currentIndex);
            currentIndex = idx;
        }
    } else {
        currentIndex--;
        if (currentIndex < 0) currentIndex = songs.length - 1;
    }

    loadSong(currentIndex);
}


// ------------------------------------------------------------
// Initialization: render queue & categories (before YT ready)
(function boot() {
    populateCategories();
    renderQueue();
    // set UI initial volume label
    elVolVal().textContent = `${elVolume().value}%`;
})();
