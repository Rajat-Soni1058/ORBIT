console.log("content.js loaded");

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "pauseVideo") {

    let video = document.querySelector("video");

    if (video) {
      video.pause();
      console.log("⏸ Video paused");
    }

    // ADD THIS (DO NOT REMOVE ABOVE CODE)

    // Pause ALL videos (helps for Shorts + multiple players)
    const allVideos = document.querySelectorAll("video");
    allVideos.forEach(v => v.pause());

    // Extra fix specifically for YouTube Shorts
    const shortsVideo = document.querySelector("ytd-reel-video-renderer video");
    if (shortsVideo) {
      shortsVideo.pause();
      console.log("⏸ Shorts video paused");
    }
  }

  // UPDATED (USE MESSAGE FROM BACKGROUND)
  if (msg.action === "timeOverAlert") {
    if (msg.message) {
      alert("📢))) " + msg.message);
    } else {
      alert("🚨 STOP WATCHING, Your Set Time is over!");
    }
  }

  // ADD THIS BLOCK (FOCUS MODE)
  if (msg.action === "toggleRecommendations") {

    const hide = msg.hide;

    // Homepage videos
    const home = document.querySelector("ytd-rich-grid-renderer");

    // Sidebar (right side)
    const sidebar = document.getElementById("secondary");

    // Below video suggestions
    const related = document.querySelector("ytd-watch-next-secondary-results-renderer");

    // Shorts shelf
    const shorts = document.querySelectorAll("ytd-reel-shelf-renderer");

    if (home) home.style.display = hide ? "none" : "block";
    if (sidebar) sidebar.style.display = hide ? "none" : "block";
    if (related) related.style.display = hide ? "none" : "block";

    shorts.forEach(s => {
      s.style.display = hide ? "none" : "block";
    });

    console.log("Focus Mode:", hide ? "ON" : "OFF");
  }

});


// AUTO APPLY ON PAGE LOAD
chrome.storage.local.get("hideRecommended", (data) => {

  if (data.hideRecommended) {

    const home = document.querySelector("ytd-rich-grid-renderer");
    const sidebar = document.getElementById("secondary");
    const related = document.querySelector("ytd-watch-next-secondary-results-renderer");
    const shorts = document.querySelectorAll("ytd-reel-shelf-renderer");

    if (home) home.style.display = "none";
    if (sidebar) sidebar.style.display = "none";
    if (related) related.style.display = "none";

    shorts.forEach(s => s.style.display = "none");

    console.log("Focus Mode auto-applied");
  }

});


/// HIDE THE COMMENT OF YOUTUBE ------------>
// Comment toggle logic
let commentInterval = null;

function applyCommentMode(hide) {

  const hideComments = () => {

    // Normal video comments
    const comments = document.querySelector("ytd-comments");

    if (comments) {
      comments.style.display = hide ? "none" : "";
    }

    // ===== ADDED: SHORTS COMMENTS =====

    // Shorts comment panel (new UI)
    const shortsPanel1 = document.querySelector("ytd-engagement-panel-section-list-renderer");
    if (shortsPanel1) {
      shortsPanel1.style.display = hide ? "none" : "";
    }

    // Shorts alternative panel
    const shortsPanel2 = document.querySelector("ytd-reel-engagement-panel-renderer");
    if (shortsPanel2) {
      shortsPanel2.style.display = hide ? "none" : "";
    }

    // =================================

  };

  hideComments();

  if (commentInterval) clearInterval(commentInterval);

  if (hide) {
    commentInterval = setInterval(hideComments, 1000);
  }
}


// LISTENER
chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "toggleComments") {
    applyCommentMode(msg.hide);
    console.log("Comments:", msg.hide ? "Hidden" : "Visible");
  }

});

/////////
chrome.storage.local.get("hideComments", (data) => {

  if (data.hideComments) {
    applyCommentMode(true);
  }

});