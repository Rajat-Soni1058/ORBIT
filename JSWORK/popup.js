//---------GLOBAL STATE (USED ACROSS FEATURES)------------>
let interval = null;
let totalSeconds = 0;
let running = false;



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
        ? "Show Recommendations"
        : "Hide Recommendations";
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

      bottomBtn.innerText = "Set Timer";
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
      bottomBtn.innerText = "Set Timer";
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
          ? "Show Recommendations"
          : "Hide Recommendations";

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

  showNotesBtn.addEventListener("click", () => {

    timerUI.style.display = "none";
    notesView.style.display = "block";

    chrome.storage.local.get("notes", (data) => {

      const notes = data.notes || {};

      notesView.innerHTML = `
        <h4 style="text-align:center; margin-bottom:15px;">
          Your Notes
        </h4>
      `;

      for (let videoId in notes) {

        const note = notes[videoId];

        const card = document.createElement("div");
        card.style.background = "#ffffff";
        card.style.border = "1px solid #e0e0e0";
        card.style.borderRadius = "10px";
        card.style.padding = "10px";
        card.style.marginBottom = "12px";
        card.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.justifyContent = "space-between";
        topRow.style.alignItems = "center";

        const title = document.createElement("div");
        title.innerText = "• " + note.title;
        title.style.fontWeight = "bold";

        const deleteBtn = document.createElement("span");
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.fontSize = "16px";
        deleteBtn.style.color = "#ff4d4d";

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
            });

          });

        };

        topRow.appendChild(title);
        topRow.appendChild(deleteBtn);

        const openNote = document.createElement("div");
        openNote.innerText = "Open Note";
        openNote.style.marginTop = "6px";
        openNote.style.cursor = "pointer";
        openNote.style.color = "#007bff";
        openNote.style.fontSize = "13px";

        openNote.onclick = () => {

          const blob = new Blob(
            [`Title: ${note.title}\n\n${note.content}`],
            { type: "text/plain" }
          );

          const url = URL.createObjectURL(blob);
          window.open(url);
        };

        card.appendChild(topRow);
        card.appendChild(openNote);

        notesView.appendChild(card);
      }

    });

  });
}