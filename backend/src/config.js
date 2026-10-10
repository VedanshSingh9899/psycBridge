// Phase 1 config. All tunables in one place.
module.exports = {
  port: process.env.PORT || 3001,
  talkHours: { start: 19, end: 23, tz: "Asia/Kolkata" }, // 7-11pm IST
  freeWindowSec: 24 * 3600,      // 1 free session / device / 24h
  sessionMaxMin: 10,             // hard close at 10 min
  sessionWrapMin: 8,             // gentle wrap prompt at 8 min
  queueCap: 50,                  // overflow -> book-later mode
  queueTimeoutMin: 15,           // offer book-later / SOS after 15m
  messageExpiryH: 48,            // auto-burn chats
  helpedVoteEnabled: true,
};
