let youtubeTabId = null;

// Listen for messages
chrome.runtime.onMessage.addListener((msg) => {

  // 🔥 START TIMER
  if (msg.action === "startTimer") {

    chrome.alarms.clear("timerAlarm");

    // store end time
    const endTime = Date.now() + msg.time * 60 * 1000;

    // ✅ FIXED (missing bracket)
    chrome.storage.local.set({
      endTime: endTime
    });

    chrome.alarms.create("timerAlarm", {
      delayInMinutes: msg.time
    });

    console.log("⏱ Timer started");
  }

  // 🔥 CANCEL TIMER
  if (msg.action === "cancelTimer") {

    chrome.alarms.clear("timerAlarm");
    chrome.storage.local.remove("endTime");

    youtubeTabId = null;

    console.log("❌ Timer cancelled");
  }

});


// 🔥 WHEN TIMER FINISHES
chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "timerAlarm") {

    console.log("⏰ Timer finished");

    // 🔔 Chrome Notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "ClockImage.png",
      title: "⏰ Time Over",
      message: "Pausing YouTube..."
    }, (id) => {

      if (chrome.runtime.lastError) {
        console.log("❌ Notification Error:", chrome.runtime.lastError.message);
      } else {
        console.log("✅ Notification shown:", id);
      }

    });

    // 🔥 FIND ALL YOUTUBE TABS
    chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {

      if (tabs.length === 0) {
        console.log("❌ No YouTube tab found");
        return;
      }

      tabs.forEach(tab => {

        // ⏸ Pause video
        chrome.tabs.sendMessage(tab.id, {
          action: "pauseVideo"
        }, () => {
          if (chrome.runtime.lastError) {
            console.log("❌ Pause failed:", chrome.runtime.lastError);
          } else {
            console.log("✅ Pause sent to tab:", tab.id);
          }
        });

        // 🔔 Show alert in page (100% reliable)
        chrome.tabs.sendMessage(tab.id, {
          action: "timeOverAlert"
        });

      });

    });

    // clear storage after finish
    chrome.storage.local.remove("endTime");
  }
});