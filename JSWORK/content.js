//---------INITIAL LOAD LOG------------>
console.log("ho gai bhaiya ---> content.js loaded");



//---------THEME DETECTION & REAPPLY LOGIC------------>
let currentTheme = document.documentElement.hasAttribute('dark') ? 'dark' : 'light';

function refreshThemeElements() {
  // Force refresh of theme-dependent elements
  autoApplyRecommendationState();
  autoApplyCommentState();
  attachButtonObserver();
  
  // Trigger YouTube to refresh search and shorts elements
  const searchInputs = document.querySelectorAll('input[aria-label*="Search"]');
  const shorts = document.querySelectorAll('ytd-reel-shelf-renderer');
  
  // Force re-render by triggering a forced style recalculation
  [searchInputs, shorts].forEach(elements => {
    elements.forEach(el => {
      if (el.style) {
        const originalDisplay = el.style.display;
        el.style.display = 'none';
        el.offsetHeight; // trigger reflow
        el.style.display = originalDisplay;
      }
    });
  });
  
  console.log("✅ Theme elements refreshed after theme change");
}

const themeObserver = new MutationObserver(() => {
  const newTheme = document.documentElement.hasAttribute('dark') ? 'dark' : 'light';
  
  if (newTheme !== currentTheme) {
    console.log("🎨 Theme changed from", currentTheme, "to", newTheme);
    currentTheme = newTheme;
    
    // Delay to ensure YouTube has processed the theme change
    setTimeout(() => {
      refreshThemeElements();
    }, 800);
  }
});

// Listen for theme changes on html element
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['dark']
});



//---------MESSAGE LISTENER (VIDEO CONTROL + ALERT + RECOMMENDATIONS)------------>
chrome.runtime.onMessage.addListener((msg) => {

  //---------PAUSE VIDEO FEATURE------------>
  if (msg.action === "pauseVideo") {

    let video = document.querySelector("video");

    if (video) {
      video.pause();
      console.log("⏸ Video paused");
    }

    const allVideos = document.querySelectorAll("video");
    allVideos.forEach(v => v.pause());

    const shortsVideo = document.querySelector("ytd-reel-video-renderer video");
    if (shortsVideo) {
      shortsVideo.pause();
      console.log("⏸ Shorts video paused");
    }
  }


  //---------TIME OVER ALERT FEATURE------------>
  if (msg.action === "timeOverAlert") {

    if (msg.message) {
      alert("📢))) " + msg.message);
    } else {
      alert("🚨 STOP WATCHING, Your Set Time is over!");
    }

  }


  //---------RECOMMENDATION TOGGLE FEATURE------------>
  if (msg.action === "toggleRecommendations") {

    const hide = msg.hide;

    const home = document.querySelector("ytd-rich-grid-renderer");
    const sidebar = document.getElementById("secondary");
    const related = document.querySelector("ytd-watch-next-secondary-results-renderer");
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



//---------AUTO APPLY RECOMMENDATION STATE------------>
function autoApplyRecommendationState() {
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
}



//---------COMMENT FEATURE (HIDE / SHOW COMMENTS WITH INTERVAL FIX)------------>
let commentInterval = null;

function applyCommentMode(hide) {

  const hideComments = () => {

    const comments = document.querySelector("ytd-comments");
    if (comments) comments.style.display = hide ? "none" : "";

    const shortsPanel1 = document.querySelector("ytd-engagement-panel-section-list-renderer");
    if (shortsPanel1) shortsPanel1.style.display = hide ? "none" : "";

    const shortsPanel2 = document.querySelector("ytd-reel-engagement-panel-renderer");
    if (shortsPanel2) shortsPanel2.style.display = hide ? "none" : "";
  };

  hideComments();

  if (commentInterval) clearInterval(commentInterval);

  if (hide) {
    commentInterval = setInterval(hideComments, 1000);
  }
}



//---------MESSAGE LISTENER (COMMENT TOGGLE)------------>
chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "toggleComments") {
    applyCommentMode(msg.hide);
    console.log("Comments:", msg.hide ? "Hidden" : "Visible");
  }

});



//---------AUTO APPLY COMMENT STATE------------>
function autoApplyCommentState() {
  chrome.storage.local.get("hideComments", (data) => {
    if (data.hideComments) applyCommentMode(true);
  });
}



//---------NOTES FEATURE (BUTTON + STORAGE + UI)------------>
let noteButtonObserver = null;
let noteContainerWaiter = null;



//---------GET NOTE BUTTON CONTAINER------------>
function getNoteButtonContainer() {
  return (
    document.querySelector("ytd-watch-metadata #top-level-buttons-computed") ||
    document.querySelector("ytd-watch-flexy #top-level-buttons-computed")
  );
}

function isWatchPage() {
  return window.location.pathname === "/watch";
}



//---------ADD NOTE BUTTON TO YOUTUBE UI------------>
function addNoteButton(container) {

  if (!container) return;
  if (container.querySelector("#addNoteBtn")) return;

  document.querySelectorAll("#addNoteBtn").forEach((el) => {
    if (!container.contains(el)) el.remove();
  });

  const btn = document.createElement("button");
  btn.id = "addNoteBtn";

  btn.innerHTML = `
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:16px;">➕</span>
      <span>Add Notes</span>
    </div>
  `;

  btn.style.background = "#f2f2f2";
  btn.style.border = "none";
  btn.style.borderRadius = "18px";
  btn.style.padding = "6px 12px";
  btn.style.marginLeft = "8px";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.display = "flex";
  btn.style.alignItems = "center";

  // Theme-aware colors
  const isDarkMode = document.documentElement.hasAttribute('dark');
  const bgColor = isDarkMode ? "#272727" : "#f2f2f2";
  const bgColorHover = isDarkMode ? "#3f3f3f" : "#e6e6e6";
  const textColor = isDarkMode ? "#ffffff" : "#000000";

  btn.style.background = bgColor;
  btn.style.color = textColor;

  btn.onmouseenter = () => btn.style.background = bgColorHover;
  btn.onmouseleave = () => btn.style.background = bgColor;



  //---------NOTE SAVE LOGIC------------>
  btn.onclick = () => {

    let videoId = new URLSearchParams(window.location.search).get("v");

    if (!videoId && window.location.pathname.includes("/shorts/")) {
      videoId = window.location.pathname.split("/shorts/")[1];
    }

    if (!videoId) {
      alert("Open a video first to add notes.");
      return;
    }

    chrome.storage.local.get("notes", (data) => {

      let notes = data.notes || {};

      if (!notes[videoId]) {

        const title = prompt("Enter note title:");
        if (!title) return;

        const content = prompt("Write your note:");
        if (!content) return;

        notes[videoId] = { title, content };

      } else {

        const newContent = prompt("Add more to your notes:");
        if (!newContent) return;

        notes[videoId].content += "\n" + newContent;
      }

      chrome.storage.local.set({ notes }, () => {
        alert("Note saved");
      });

    });

  };



  //---------BUTTON PLACEMENT------------>
  const buttons = container.querySelectorAll("button");

  if (buttons.length > 0) {
    buttons[buttons.length - 1].after(btn);
  } else {
    container.appendChild(btn);
  }
}



//---------OBSERVER FEATURE (HANDLE YOUTUBE DYNAMIC UI)------------>
function attachButtonObserver() {

  if (noteButtonObserver) {
    noteButtonObserver.disconnect();
    noteButtonObserver = null;
  }

  if (noteContainerWaiter) {
    clearInterval(noteContainerWaiter);
    noteContainerWaiter = null;
  }

  if (!isWatchPage()) return;

  let attempts = 0;
  const maxAttempts = 20;

  noteContainerWaiter = setInterval(() => {

    attempts++;

    const container = getNoteButtonContainer();

    if (!container) {
      if (attempts >= maxAttempts) {
        clearInterval(noteContainerWaiter);
        noteContainerWaiter = null;
      }
      return;
    }

    clearInterval(noteContainerWaiter);
    noteContainerWaiter = null;

    addNoteButton(container);

    noteButtonObserver = new MutationObserver(() => {
      addNoteButton(container);
    });

    noteButtonObserver.observe(container, {
      childList: true,
      subtree: true
    });

  }, 300);
}



//---------INITIAL LOAD------------>
function initNonCriticalFeatures() {
  autoApplyRecommendationState();
  autoApplyCommentState();
  attachButtonObserver();
}

function scheduleNonCriticalInit() {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      initNonCriticalFeatures();
    }, { timeout: 1500 });
    return;
  }

  setTimeout(() => {
    initNonCriticalFeatures();
  }, 250);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleNonCriticalInit, { once: true });
} else {
  scheduleNonCriticalInit();
}



//---------YOUTUBE NAVIGATION HANDLING------------>
window.addEventListener("yt-navigate-finish", () => {
  setTimeout(() => {
    attachButtonObserver();
  }, 500);
});

//-------------Dark/Light mode---------->
//---------DARK MODE FEATURE (NATIVE-LIKE BEHAVIOR)------------>
let darkModeEnabled = false;

function setDarkMode(enabled) {
  if (enabled) {
    document.documentElement.setAttribute("dark", "");
  } else {
    document.documentElement.removeAttribute("dark");
  }
}

function getCookie(name) {
  const row = document.cookie
    .split(";")
    .map(v => v.trim())
    .find(v => v.startsWith(name + "="));

  if (!row) return "";
  return row.substring(name.length + 1);
}

function setYoutubeThemePreference(enabled) {
  const rawPref = decodeURIComponent(getCookie("PREF") || "");
  const prefPairs = rawPref ? rawPref.split("&") : [];
  const prefMap = {};

  prefPairs.forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx);
    const value = pair.slice(idx + 1);
    if (key) prefMap[key] = value;
  });

  // YouTube theme flag: f6=400 for dark, f6=0 for light.
  prefMap.f6 = enabled ? "400" : "0";

  const nextPref = Object.entries(prefMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  document.cookie = `PREF=${encodeURIComponent(nextPref)}; path=/; domain=.youtube.com; max-age=31536000; SameSite=Lax`;
}

function applyYoutubeTheme(enabled) {
  setYoutubeThemePreference(enabled);
  setDarkMode(enabled);
}

function applyDarkModeFromStorage() {
  chrome.storage.local.get("darkMode", (data) => {

    darkModeEnabled = Boolean(data.darkMode);
    applyYoutubeTheme(darkModeEnabled);

  });
}

chrome.runtime.onMessage.addListener((msg) => {

  if (msg.action === "toggleDarkMode") {

    darkModeEnabled = Boolean(msg.enabled);
    applyYoutubeTheme(darkModeEnabled);
    
    // Refresh theme elements after dark mode toggle
    setTimeout(() => {
      refreshThemeElements();
    }, 1000);

  }

});

// Run once when script loads.
applyDarkModeFromStorage();
