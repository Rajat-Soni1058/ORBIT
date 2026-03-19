let youtubeTabId = null;

// Listen for messages
chrome.runtime.onMessage.addListener((msg) => {

  // 🔥 START TIMER
  if (msg.action === "startTimer") {

    chrome.alarms.clear("timerAlarm");

    // store end time
    const endTime = Date.now() + msg.time * 60 * 1000;

    // 🔥 ADD message storage (DO NOT REMOVE ANYTHING)
    chrome.storage.local.set({
      endTime: endTime,
      userMessage: msg.message   // 👈 ADDED
    });

    chrome.alarms.create("timerAlarm", {
      delayInMinutes: msg.time
    });

    console.log("⏱ Timer started");
  }

  // 🔥 CANCEL TIMER
  if (msg.action === "cancelTimer") {

    chrome.alarms.clear("timerAlarm");

    // 🔥 ALSO REMOVE MESSAGE (ADDED)
    chrome.storage.local.remove(["endTime", "userMessage"]);

    youtubeTabId = null;

    console.log("❌ Timer cancelled");
  }

});


// 🔥 WHEN TIMER FINISHES
chrome.alarms.onAlarm.addListener((alarm) => {

  if (alarm.name === "timerAlarm") {

    console.log("⏰ Timer finished");

    // 🔥 GET MESSAGE FROM STORAGE (ADDED)
    chrome.storage.local.get("userMessage", (data) => {

      const finalMessage = data.userMessage || "⏰ Time is over!";

      // 🔔 Chrome Notification (UPDATED MESSAGE)
      chrome.notifications.create({
        type: "basic",
        iconUrl: "ClockImage.png",
        title: "⏰ Time Over",
        message: finalMessage   // 👈 UPDATED
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
          });

          // 🔔 SEND MESSAGE TO ALERT (UPDATED)
          chrome.tabs.sendMessage(tab.id, {
            action: "timeOverAlert",
            message: finalMessage   // 👈 ADDED
          });

        });

      });

      // clear storage after finish
      chrome.storage.local.remove(["endTime", "userMessage"]);

    });

  }
});