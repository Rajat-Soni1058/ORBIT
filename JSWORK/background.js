let youtubeTabId = null;

// Listen for messages
chrome.runtime.onMessage.addListener((msg) => {

  // 🔥 START TIMER
  if (msg.action === "startTimer") {

    // ❗ Clear any previous timer first
    chrome.alarms.clear("timerAlarm");

    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

      if (tabs.length > 0) {

        youtubeTabId = tabs[0].id;

        chrome.alarms.create("timerAlarm", {
          delayInMinutes: msg.time
        });

        console.log("⏱ New timer started");
      }
    });
  }

  // 🔥 CANCEL TIMER (RESET BUTTON)
  if (msg.action === "cancelTimer") {

    chrome.alarms.clear("timerAlarm", (wasCleared) => {
      if (wasCleared) {
        console.log("❌ Timer cancelled");
      }
    });

    youtubeTabId = null;
  }

});


// When timer finishes
chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "timerAlarm") {

    console.log("⏰ Timer finished");

    chrome.notifications.create({
      type: "basic",
      iconUrl: "ClockImage.png",
      title: "⏰ Time Over",
      message: "Your set time is over!"
    });

    if (youtubeTabId !== null) {

      chrome.tabs.sendMessage(youtubeTabId, {
        action: "pauseVideo"
      });

    }
  }
});