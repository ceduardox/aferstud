importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

function extractTargetUrlFromNotification(notification) {
  const data = notification?.data || {};
  const custom = data?.custom || {};
  const additional = custom?.a || {};
  return (
    data?.url ||
    data?.deep_link ||
    custom?.u ||
    additional?.url ||
    "/"
  );
}

function extractConversationId(targetUrl) {
  try {
    const parsed = new URL(targetUrl, self.location.origin);
    const raw = parsed.searchParams.get("conversationId");
    if (!raw) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

self.addEventListener("notificationclick", (event) => {
  const targetUrl = extractTargetUrlFromNotification(event.notification);
  const resolvedUrl = new URL(targetUrl, self.location.origin).toString();
  const conversationId = extractConversationId(resolvedUrl);

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const sameOriginClient = windowClients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient) {
        await sameOriginClient.focus();
        sameOriginClient.postMessage({
          type: "RYZ_OPEN_CONVERSATION",
          url: resolvedUrl,
          conversationId,
          source: "onesignal-notification-click",
        });
        return;
      }

      await clients.openWindow(resolvedUrl);
    })(),
  );
});
