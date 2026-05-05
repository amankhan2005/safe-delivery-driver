export async function registerForPushNotifications() {
  return null;
}

export async function showNewOrderNotification(order) {
  return null;
}

export async function showLocalNotification(title, body, data = {}) {
  return null;
}

export function addNotificationResponseListener(callback) {
  return { remove: () => {} };
}

export function addNotificationReceivedListener(callback) {
  return { remove: () => {} };
}