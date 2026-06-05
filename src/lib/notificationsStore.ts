export interface Notification {
  id: string;
  email: string;
  phone?: string;
  auditId: string;
  companyName: string;
  type: "audit_pending" | "audit_acknowledged" | "audit_completed";
  status: "unread" | "read";
  messageFr: string;
  messageEn: string;
  createdAt: string;
}

export const getNotifications = (): Notification[] => {
  const data = localStorage.getItem("gln_notifications_db");
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem("gln_notifications_db", JSON.stringify(notifications));
};

export const addNotification = (notification: Omit<Notification, "id" | "createdAt" | "status">) => {
  const notifications = getNotifications();
  const newNotif: Notification = {
    ...notification,
    id: "notif-" + Math.random().toString(36).substring(2, 9),
    status: "unread",
    createdAt: new Date().toISOString()
  };
  notifications.unshift(newNotif); // latest first
  saveNotifications(notifications);
  // Dispatch a custom event to notify components that notifications changed
  window.dispatchEvent(new Event("gln_notifications_changed"));
  return newNotif;
};

export const getNotificationsForUser = (email?: string, phone?: string): Notification[] => {
  const all = getNotifications();
  if (!email && !phone) return [];
  
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.trim().replace(/\s+/g, "");

  return all.filter(n => {
    const notifEmail = n.email.trim().toLowerCase();
    const notifPhone = n.phone?.trim().replace(/\s+/g, "");
    
    const emailMatch = cleanEmail && notifEmail === cleanEmail;
    const phoneMatch = cleanPhone && notifPhone && notifPhone.includes(cleanPhone);
    
    return emailMatch || phoneMatch;
  });
};

export const markAsRead = (id: string) => {
  const all = getNotifications();
  const updated = all.map(n => n.id === id ? { ...n, status: "read" as const } : n);
  saveNotifications(updated);
  window.dispatchEvent(new Event("gln_notifications_changed"));
};

export const markAllAsReadForUser = (email?: string, phone?: string) => {
  const all = getNotifications();
  if (!email && !phone) return;
  
  const cleanEmail = email?.trim().toLowerCase();
  const cleanPhone = phone?.trim().replace(/\s+/g, "");

  const updated = all.map(n => {
    const notifEmail = n.email.trim().toLowerCase();
    const notifPhone = n.phone?.trim().replace(/\s+/g, "");
    
    const emailMatch = cleanEmail && notifEmail === cleanEmail;
    const phoneMatch = cleanPhone && notifPhone && notifPhone.includes(cleanPhone);
    
    if (emailMatch || phoneMatch) {
      return { ...n, status: "read" as const };
    }
    return n;
  });
  saveNotifications(updated);
  window.dispatchEvent(new Event("gln_notifications_changed"));
};
