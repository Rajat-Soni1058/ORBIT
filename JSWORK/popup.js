//---------GLOBAL STATE (USED ACROSS FEATURES)------------>
let interval = null;
let totalSeconds = 0;
let running = false;
// ================== RATING FUNCTION ==================
function calculateRating(sentiment, likes = 0) {
  const pos = sentiment.positive || 0;
  const neg = sentiment.negative || 0;

  const total = pos + neg;
  const sentimentScore = total === 0 ? 0.5 : pos / total;

  const likeScore = Math.min(Math.log10(likes + 1) / 5, 1);

  const rating = (0.7 * sentimentScore + 0.3 * likeScore) * 10;

  return rating.toFixed(1);
}



// Helper to show/hide empty ORBIT brand depending on UI state
function updateEmptyView() {
  try {
    const timerUI = document.getElementById("timerUI");
    const notesView = document.getElementById("notesView");
    const emptyView = document.getElementById("emptyView");

    const timerVisible = timerUI && timerUI.style.display !== "none";
    const notesVisible = notesView && notesView.style.display !== "none";
    const hasNoteCards = notesView && notesView.querySelector && notesView.querySelector('.note-card');

    if (!timerVisible && !notesVisible) {
      if (emptyView) {
        emptyView.classList.add('empty-visible');
      }
      return;
    }

    if (notesVisible && !hasNoteCards) {
      if (emptyView) {
        emptyView.classList.add('empty-visible');
      }
      return;
    }

    if (emptyView) {
      emptyView.classList.remove('empty-visible');
    }
  } catch (e) {
    const emptyView = document.getElementById("emptyView");
    if (emptyView) emptyView.classList.remove('empty-visible');
  }
}



//---------INITIAL LOAD FEATURE (RESTORE TIMER + BUTTON STATES)------------>
window.onload = () => {

  const timerUI = document.getElementById("timerUI");
  const notesView = document.getElementById("notesView");
  const input = document.getElementById("time");
  const messageInput = document.getElementById("customMessage");
  const startBtn = document.getElementById("startBtn");
  const bottomBtn = document.getElementById("bottomBtn");
  const toggleBtn = document.getElementById("toggleRecommend");
  const commentBtn = document.getElementById("toggleComments");

  chrome.storage.local.get(["endTime"], (data) => {

    if (data.endTime) {

      const remaining = Math.floor((data.endTime - Date.now()) / 1000);

      if (remaining > 0) {

        totalSeconds = remaining;
        running = true;

        timerUI.style.display = "block";
        notesView.style.display = "none";

        // hide ORBIT brand when timer UI is shown
        updateEmptyView();

        input.style.display = "none";
        messageInput.style.display = "none";
        startBtn.style.display = "none";
        bottomBtn.innerText = "Reset Timer";

        startCountdown();
      }
    }
  });

  // Recommendation button state
  if (toggleBtn) {
    chrome.storage.local.get("hideRecommended", (data) => {
      toggleBtn.innerText = data.hideRecommended
        ? "🐵 Show Recommendations"
        : "🙈 Hide Recommendations";
    });
  }

  // Comment button state
  if (commentBtn) {
    chrome.storage.local.get("hideComments", (data) => {
      commentBtn.innerText = data.hideComments
        ? "Show Comments"
        : "Hide Comments";
    });
  }
};



//--------TIMER FEATURE (SET/RESET) BUTTON LOGIC------------>
{
  const bottomBtn = document.getElementById("bottomBtn");
  const timerUI = document.getElementById("timerUI");
  const notesView = document.getElementById("notesView");
  const input = document.getElementById("time");
  const messageInput = document.getElementById("customMessage");
  const startBtn = document.getElementById("startBtn");
  const countdown = document.getElementById("countdown");

  bottomBtn.addEventListener("click", () => {

    if (!running) {

      timerUI.style.display = "block";
      notesView.style.display = "none";

      // hide brand when timer opened
      updateEmptyView();

    } else {

      chrome.runtime.sendMessage({ action: "cancelTimer" });

      chrome.storage.local.remove("endTime");

      clearInterval(interval);
      running = false;

      countdown.innerText = "";
      input.style.display = "block";
      messageInput.style.display = "block";
      startBtn.style.display = "inline-block";
      startBtn.innerText = "Start";
      startBtn.disabled = false;

      bottomBtn.innerText = "⏳ Set Timer";

      // update empty view after reset
      updateEmptyView();
    }
  });
}



//---------TIMER FEATURE (START BUTTON LOGIC)------------>
{
  const startBtn = document.getElementById("startBtn");
  const input = document.getElementById("time");
  const messageInput = document.getElementById("customMessage");
  const bottomBtn = document.getElementById("bottomBtn");

  startBtn.addEventListener("click", () => {

    let minutes = input.value;
    let userMessage = messageInput.value.trim();

    if (!minutes || minutes <= 0) {
      alert("Enter valid time");
      return;
    }

    if (userMessage === "") {
      userMessage = "⏰ Time is over!";
    }

    chrome.runtime.sendMessage({ action: "cancelTimer" });

    totalSeconds = Math.floor(minutes * 60);
    running = true;

    chrome.runtime.sendMessage({
      action: "startTimer",
      time: parseFloat(minutes),
      message: userMessage
    });

    input.style.display = "none";
    messageInput.style.display = "none";
    startBtn.style.display = "none";
    bottomBtn.innerText = "Reset Timer";

    startCountdown();

    // hide brand once timer starts
    updateEmptyView();
  });
}



//---------TIMER FEATURE (COUNTDOWN LOGIC)------------>
function startCountdown() {

  const countdown = document.getElementById("countdown");
  const input = document.getElementById("time");
  const messageInput = document.getElementById("customMessage");
  const startBtn = document.getElementById("startBtn");
  const bottomBtn = document.getElementById("bottomBtn");

  clearInterval(interval);

  interval = setInterval(() => {

    totalSeconds--;

    if (totalSeconds <= 0) {
      clearInterval(interval);
      running = false;
      countdown.innerText = "";
      input.style.display = "block";
      messageInput.style.display = "block";
      startBtn.style.display = "inline-block";
      startBtn.innerText = "Start";
      bottomBtn.innerText = "⏳ Set Timer";
      // timer ended — update empty/brand visibility
      updateEmptyView();
      return;
    }

    updateDisplay();

  }, 1000);
}



//---------TIMER FEATURE (UPDATE DISPLAY)------------>
function updateDisplay() {

  const countdown = document.getElementById("countdown");

  let min = Math.floor(totalSeconds / 60);
  let sec = totalSeconds % 60;

  countdown.innerText =
    `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}



//---------YOUTUBE FEATURE (TOGGLE RECOMMENDATIONS)------------>
{
  const toggleBtn = document.getElementById("toggleRecommend");

  if (toggleBtn) {

    toggleBtn.addEventListener("click", () => {

      chrome.storage.local.get("hideRecommended", (data) => {

        const newState = !data.hideRecommended;

        chrome.storage.local.set({ hideRecommended: newState });

        toggleBtn.innerText = newState
          ? "🐵 Show Recommendations"
          : "🙈 Hide Recommendations";

        chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: "toggleRecommendations",
              hide: newState
            });
          });

        });

      });

    });

  }
}



//---------YOUTUBE FEATURE (TOGGLE COMMENTS)------------>
{
  const commentBtn = document.getElementById("toggleComments");

  if (commentBtn) {

    commentBtn.addEventListener("click", () => {

      chrome.storage.local.get("hideComments", (data) => {

        const newState = !data.hideComments;

        chrome.storage.local.set({ hideComments: newState });

        commentBtn.innerText = newState
          ? "Show Comments"
          : "Hide Comments";

        chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: "toggleComments",
              hide: newState
            });
          });

        });

      });

    });

  }
}



//---------NOTES FEATURE (DISPLAY + DELETE + OPEN NOTE)------------>
{
  const showNotesBtn = document.getElementById("showNotes");
  const timerUI = document.getElementById("timerUI");
  const notesView = document.getElementById("notesView");
  const emptyView = document.getElementById("emptyView");

  // use global updateEmptyView() helper defined above

  showNotesBtn.addEventListener("click", () => {

    timerUI.style.display = "none";

    // Hide the empty ORBIT view immediately when opening notes
    // This prevents the ORBIT placeholder from briefly flashing while notes load
    if (emptyView) {
      emptyView.classList.remove('empty-visible');
    }

    // show an immediate loading placeholder to avoid a blank white flash
    notesView.innerHTML = `
      <div class="notes-header">
        <span>Your Notes</span>
      </div>
      <div class="notes-loading">Loading notes…</div>
    `;
    notesView.style.display = "block";

    // hide brand because notes view is open
    updateEmptyView();

    chrome.storage.local.get("notes", (data) => {

      const notes = data.notes || {};
      const noteEntries = Object.entries(notes);
      const palette = ["#0f4a68", "#0f4a68", "#0f4a68", "#0f4a68", "#0f4a68", "#0f4a68"];

      // build full notes HTML once data is available
      notesView.innerHTML = `
        <div class="notes-header">
          <span>Your Notes</span>
        </div>
        <div class="notes-grid" id="notesGrid"></div>
      `;

      const notesGrid = document.getElementById("notesGrid");

      if (noteEntries.length === 0) {
        // show empty notes message inside notes view; keep the main empty brand hidden
        notesGrid.innerHTML = `<div class="notes-empty">No notes yet. Add notes from a YouTube video.</div>`;
        // do NOT call updateEmptyView() here — we want the notes view's message to show
        // without the ORBIT brand briefly appearing.
        return;
      }

      noteEntries.forEach(([videoId, note], index) => {

        const cardColor = palette[index % palette.length];

        const card = document.createElement("div");
        card.className = "note-card";
        card.style.background = cardColor;

        const topRow = document.createElement("div");
        topRow.className = "note-top";

        const titleWrap = document.createElement("div");
        titleWrap.style.display = "flex";
        titleWrap.style.alignItems = "center";

        const bullet = document.createElement("span");
        bullet.className = "note-bullet";

        const title = document.createElement("h5");
        title.className = "note-title";
        title.style.margin = "0";
        title.innerText = note.title;

        titleWrap.appendChild(bullet);
        titleWrap.appendChild(title);

        const deleteBtn = document.createElement("span");
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.className = "delete-note-btn";

        deleteBtn.onmouseenter = () => {
          deleteBtn.style.transform = "scale(1.2)";
        };

        deleteBtn.onmouseleave = () => {
          deleteBtn.style.transform = "scale(1)";
        };

        deleteBtn.onclick = () => {

          chrome.storage.local.get("notes", (data) => {

            let allNotes = data.notes || {};
            delete allNotes[videoId];

                chrome.storage.local.set({ notes: allNotes }, () => {
                  showNotesBtn.click();
                  setTimeout(updateEmptyView, 60);
                });

          });

        };

        topRow.appendChild(titleWrap);
        topRow.appendChild(deleteBtn);

        const openNote = document.createElement("div");
        openNote.innerText = "Open Note";
        openNote.className = "open-note-btn";

        openNote.onclick = () => {

          const escapeHtml = (text) => String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");

          const safeTitle = escapeHtml(note.title || "Untitled Note");
          const safeContent = escapeHtml(note.content || "No content").replace(/\n/g, "<br>");

          const notePageHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 24px 20px;
      font-family: "Segoe UI", Arial, sans-serif;
      background: #ffffff;
      color: #111827;
    }

    .note-title {
      display: block;
      width: 100%;
      text-align: center;
      font-size: 32px;
      font-weight: 800;
      margin: 8px 0 20px;
      color: #0f172a;
      letter-spacing: 0.2px;
    }

    .note-content {
      display: block;
      margin: 0 8px;
      padding: 14px 6px 40px 6px;
      font-size: 18px;
      line-height: 1.7;
      white-space: pre-wrap;
      text-align: left;
      color: #1f2937;
      word-break: break-word;
    }

    .page-border-top {
      height: 6px;
      background: transparent;
    }
  </style>
</head>
<body>
  <div class="page-border-top"></div>
  <h1 class="note-title">${safeTitle}</h1>
  <div class="note-content">${safeContent}</div>
</body>
</html>`;

          const blob = new Blob([notePageHtml], { type: "text/html" });

          const url = URL.createObjectURL(blob);
          window.open(url);
        };

        const actionsRow = document.createElement("div");
        actionsRow.className = "note-actions";
        actionsRow.appendChild(openNote);

        card.appendChild(topRow);
        // Append actions immediately after title with minimal gap
        card.appendChild(actionsRow);

        notesGrid.appendChild(card);
      });

      // after rendering notes
      setTimeout(updateEmptyView, 30);

    });

  });
}

// ---------VIDEO ANALYZER FEATURE------------>
{
  const analyzeBtn = document.getElementById('analyzeVideo');
  const notesView = document.getElementById('notesView');
  const timerUI = document.getElementById('timerUI');

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', async () => {
      // Quick verification video page is still open
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = (tabs && tabs[0]) || null;
        if (!tab || !tab.url || !tab.url.includes('youtube.com') || 
            (!tab.url.includes('/watch?v=') && !tab.url.includes('/shorts/'))) {
          alert('Open a YouTube video to analyze.');
          checkVideoAvailability();
          return;
        }

      // prepare UI: hide timer, show notesView as analyzer canvas
      timerUI.style.display = 'none';
      notesView.style.display = 'block';

      // hide the empty brand immediately
      const emptyView = document.getElementById('emptyView');
      if (emptyView) emptyView.classList.remove('empty-visible');

      notesView.innerHTML = `
        <div class="notes-header" style="margin:0 0 6px;"><span>Video Analyzer</span></div>
        <div id="analyzerStatus" class="notes-loading" style="padding:4px 8px 6px; margin:0; font-size:13px;">Preparing analysis…</div>
        <div id="analyzerResults" style="margin-top:6px; text-align:center;"></div>
      `;

      // find active YouTube tab
      });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = (tabs && tabs[0]) || null;
        if (!tab || !tab.url || !tab.url.includes('youtube.com')) {
          document.getElementById('analyzerStatus').innerText = 'Open a YouTube video tab to analyze.';
          return;
        }

        // request comments extraction from content script (first 100 comments)
        const maxComments = 100;
        chrome.tabs.sendMessage(tab.id, { action: 'extractComments', max: maxComments }, async (response) => {
          if (!response || response.error) {
            document.getElementById('analyzerStatus').innerText = 'Failed to extract comments: ' + (response && response.error ? response.error : 'No response');
            return;
          }

          const comments = response.comments || [];
          if (comments.length === 0) {
            document.getElementById('analyzerStatus').innerText = 'No comments found to analyze.';
            return;
          }

          document.getElementById('analyzerStatus').innerText = `Found ${comments.length}/${maxComments} comments. Analyzing available comments…`;

          // send comments to model in batches
          const apiUrl = 'http://43.205.213.66:8000/analyze_sentiment';
          const batchSize = 200; // safe batch

          let totalPositive = 0;
          let totalNegative = 0;
          let totalNeutral = 0;

          for (let i = 0; i < comments.length; i += batchSize) {
            const batch = comments.slice(i, i + batchSize);
            document.getElementById('analyzerStatus').innerText = `Analyzing comments ${i + 1}-${Math.min(i + batchSize, comments.length)} of ${comments.length}…`;

            try {
              // send batch to background to avoid popup/network/CORS issues
              const resp = await new Promise((resolve) => {
                try {
                  chrome.runtime.sendMessage({ action: 'analyzeBatch', apiUrl, batch }, (r) => resolve(r));
                } catch (e) { resolve({ ok: false, error: String(e) }); }
              });

              if (!resp) {
                document.getElementById('analyzerStatus').innerText = 'No response from background.';
                return;
              }

              if (!resp.ok) {
                console.error('Model background error', resp);
                document.getElementById('analyzerStatus').innerText = `Model API error: ${resp.status || ''} ${resp.statusText || resp.error || ''}`;
                return;
              }

              const json = resp.body;

              // support multiple response formats (same logic as before)
              if (typeof json === 'object') {
                if (Array.isArray(json)) {
                  json.forEach(label => {
                    const l = String(label).toLowerCase();
                    if (l.includes('pos')) totalPositive++;
                    else if (l.includes('neg')) totalNegative++;
                    else totalNeutral++;
                  });
                } else if ('positive' in json || 'negative' in json) {
                  totalPositive += Number(json.positive || 0);
                  totalNegative += Number(json.negative || 0);
                  totalNeutral += Number(json.neutral || 0);
                } else if ('labels' in json && Array.isArray(json.labels)) {
                  json.labels.forEach(l => {
                    const s = String(l).toLowerCase();
                    if (s.includes('pos')) totalPositive++;
                    else if (s.includes('neg')) totalNegative++;
                    else totalNeutral++;
                  });
                } else {
                  const values = Object.values(json);
                  values.forEach(v => {
                    if (typeof v === 'string') {
                      const s = v.toLowerCase();
                      if (s.includes('pos')) totalPositive++;
                      else if (s.includes('neg')) totalNegative++;
                      else totalNeutral++;
                    }
                  });
                }
              }

            } catch (err) {
              console.error('Error sending to model', err);
              document.getElementById('analyzerStatus').innerText = 'Network error while contacting model.';
              return;
            }

          }

          // show aggregated results
          document.getElementById('analyzerStatus').innerText = 'Analysis complete';

          //rating
          

const sentiment = {
  positive: totalPositive,
  negative: totalNegative
};

// since popup can't access DOM likes → keep 0 OR optional later
const rating = calculateRating(sentiment, 0);

console.log("⭐ Rating (popup):", rating);
//-----
          const results = document.getElementById('analyzerResults');
          results.innerHTML = `
  <div style="font-size:18px; font-weight:700; margin:0 0 8px;">Sentiment Summary</div>

  <div style="margin-top:6px; padding:8px; box-sizing:border-box;">
    <div style="
      display:grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap:12px;
      width:100%;
      max-width:290px;
      margin:0 auto;
    ">
      <div style="background:#0f4f63; border:1px solid rgba(116, 228, 255, 0.24); border-radius:10px; height:110px; padding:12px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <div style="font-size:14px; color:#b9f5ff; line-height:1.1;">Positive</div>
        <div style="margin-top:6px; font-size:36px; font-weight:800; color:#b9f5ff; line-height:1;">${totalPositive}</div>
      </div>

      <div style="background:#11415b; border:1px solid rgba(116, 228, 255, 0.2); border-radius:10px; height:110px; padding:12px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <div style="font-size:14px; color:#a9e6ff; line-height:1.1;">Negative</div>
        <div style="margin-top:6px; font-size:36px; font-weight:800; color:#a9e6ff; line-height:1;">${totalNegative}</div>
      </div>

      <div style="background:#16384f; border:1px solid rgba(116, 228, 255, 0.18); border-radius:10px; height:110px; padding:12px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <div style="font-size:14px; color:#cbeeff; line-height:1.1;">Neutral</div>
        <div style="margin-top:6px; font-size:36px; font-weight:800; color:#cbeeff; line-height:1;">${totalNeutral}</div>
      </div>

      <div style="background:#08273b; border:1px solid rgba(116, 228, 255, 0.28); border-radius:10px; height:110px; padding:12px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <div style="font-size:14px; color:#e7fbff; line-height:1.1;">Rating</div>
        <div style="margin-top:6px; font-size:32px; font-weight:800; color:#e7fbff; line-height:1;">⭐ ${rating}/10</div>
      </div>
    </div>
  </div>
`;

        });

      });

    });
  }

}

// DARK MODE TOGGLE
const darkBtn = document.getElementById("toggleDark");

// ---------VIDEO AVAILABILITY CHECK------------>
function checkVideoAvailability() {
  const analyzeBtn = document.getElementById('analyzeVideo');
  if (!analyzeBtn) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = (tabs && tabs[0]) || null;
    const isYouTube = tab && tab.url && tab.url.includes('youtube.com');
    const isVideoPage = isYouTube && (tab.url.includes('/watch?v=') || tab.url.includes('/shorts/'));

    if (!isVideoPage) {
      analyzeBtn.disabled = true;
      analyzeBtn.style.opacity = '0.5';
      analyzeBtn.style.cursor = 'not-allowed';
      analyzeBtn.title = 'Open a YouTube video to analyze';
    } else {
      analyzeBtn.disabled = false;
      analyzeBtn.style.opacity = '1';
      analyzeBtn.style.cursor = 'pointer';
      analyzeBtn.title = 'Analyze video comments';
    }
  });
}

// Check video on popup open
setTimeout(checkVideoAvailability, 20);

if (darkBtn) {

  // Load saved state
  chrome.storage.local.get("darkMode", (data) => {
    darkBtn.innerText = data.darkMode
      ? "🔆 Light Mode"
      : "🔆 Dark Mode";
  });

  darkBtn.addEventListener("click", () => {

    chrome.storage.local.get("darkMode", (data) => {

      const newState = !data.darkMode;

      chrome.storage.local.set({ darkMode: newState });

      darkBtn.innerText = newState
        ? "🔆 Light Mode"
        : "🔆 Dark Mode";

      // Send message to YouTube tabs
      chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            action: "toggleDarkMode",
            enabled: newState
          });
        });

      });

    });

  });

}

// Initial empty view check on popup open
// Run the unified empty view updater on popup open
try { updateEmptyView(); } catch (e) { /* ignore */ }
 

// Ensure ORBIT text is reset to black on every popup open by clearing any persisted flag
try { chrome.storage.local.remove('orbitTextWhite'); } catch (e) { /* ignore */ }

// Make ORBIT text white on the first user button click for this popup session (no persistence)
(function makeOrbitWhiteOnFirstClickSession() {
  const clickHandler = (ev) => {
    const target = ev.target;
    if (!target) return;

    if (target.closest && (target.closest('button') || target.classList.contains('open-note-btn') || target.classList.contains('delete-note-btn'))) {
      const brand = document.querySelector('.orbit-brand');
      if (brand) brand.classList.add('orbit-white');
      document.removeEventListener('click', clickHandler, true);
    }
  };

  document.addEventListener('click', clickHandler, true);
})();

//pdf generator logic
const pdfBtn = document.getElementById("generatePDF");

if (pdfBtn) {
  pdfBtn.addEventListener("click", generatePDF);
}

function generatePDF() {

  chrome.storage.local.get("snapshots", (data) => {

    const snaps = data.snapshots || [];

    if (snaps.length === 0) {
      alert("No snapshots available");
      return;
    }

    const printWindow = window.open("", "_blank");

    let html = `
      <html>
      <head>
        <title>Snapshots PDF</title>
        <style>
          body { text-align:center; font-family:sans-serif; }
          img { width:90%; margin:20px 0; page-break-after: always; }
        </style>
      </head>
      <body>
    `;

    snaps.forEach(snap => {
  html += `<img src="${snap.img}" />`;
});

    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.print();

      // clear storage after use
      chrome.storage.local.remove("snapshots");
    };

  });
}
//-----------

const clearBtn = document.getElementById("clearSnaps");

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    chrome.storage.local.remove("snapshots", () => {
      alert("📸 Snapshots cleared!");
    });
  });
}
