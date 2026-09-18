self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Finanças Pro', body: event.data?.text() || 'Você tem uma nova notificação.' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Finanças Pro', {
    body: data.body || data.message || '', icon: data.icon || '/assets/alice-preview.png', badge: data.badge || '/assets/alice-preview.png', data: { url: data.url || '/' }, tag: data.tag || 'financas-pro'
  }));
});
self.addEventListener('notificationclick', event => { event.notification.close(); event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => { const target = event.notification.data?.url || '/'; for (const c of list) if ('focus' in c) return c.focus(); return clients.openWindow(target); })); });
