// sw.js
let activeTimers = new Map();

self.addEventListener('message', event => {
    const { action, id, duration, type } = event.data;
    
    switch(action) {
        case 'START_TIMER':
            const endTime = Date.now() + (duration * 60 * 1000);
            activeTimers.set(id, {
                endTime,
                duration,
                type, // 'focus' or 'break'
                timeoutId: setTimeout(() => {
                    // Notification akan muncul bahkan saat tab tidak aktif
                    self.registration.showNotification(
                        type === 'focus' ? '🍅 Focus Session Complete!' : '☕ Break Time Over!',
                        {
                            body: type === 'focus' ? 
                                'Great work! Time for a 5-minute break.' : 
                                'Ready for another focus session?',
                            icon: '/logo.png',
                            badge: '/logo.png',
                            tag: `pomodoro-${type}`,
                            requireInteraction: true,
                            actions: [
                                { 
                                    action: type === 'focus' ? 'start_break' : 'start_focus', 
                                    title: type === 'focus' ? 'Start Break' : 'Start Focus' 
                                },
                                { action: 'dismiss', title: 'Dismiss' }
                            ],
                            data: { type, id }
                        }
                    );
                    activeTimers.delete(id);
                }, duration * 60 * 1000)
            });
            break;
            
        case 'STOP_TIMER':
            if (activeTimers.has(id)) {
                clearTimeout(activeTimers.get(id).timeoutId);
                activeTimers.delete(id);
            }
            break;
            
        case 'PAUSE_TIMER':
            if (activeTimers.has(id)) {
                const timer = activeTimers.get(id);
                const remainingTime = timer.endTime - Date.now();
                clearTimeout(timer.timeoutId);
                activeTimers.set(id, { ...timer, remainingTime, paused: true });
            }
            break;
            
        case 'RESUME_TIMER':
            if (activeTimers.has(id)) {
                const timer = activeTimers.get(id);
                if (timer.paused && timer.remainingTime > 0) {
                    timer.timeoutId = setTimeout(() => {
                        self.registration.showNotification(
                            timer.type === 'focus' ? '🍅 Focus Session Complete!' : '☕ Break Time Over!',
                            {
                                body: timer.type === 'focus' ? 
                                    'Great work! Time for a 5-minute break.' : 
                                    'Ready for another focus session?',
                                icon: '/logo.png',
                                tag: `pomodoro-${timer.type}`,
                                requireInteraction: true,
                                actions: [
                                    { 
                                        action: timer.type === 'focus' ? 'start_break' : 'start_focus', 
                                        title: timer.type === 'focus' ? 'Start Break' : 'Start Focus' 
                                    },
                                    { action: 'dismiss', title: 'Dismiss' }
                                ],
                                data: { type: timer.type, id }
                            }
                        );
                        activeTimers.delete(id);
                    }, timer.remainingTime);
                    activeTimers.set(id, { ...timer, paused: false });
                }
            }
            break;
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    const { action } = event;
    const { type, id } = event.notification.data || {};
    
    if (action === 'start_break' || action === 'start_focus') {
        // Buka tab dan kirim pesan untuk start break/focus
        event.waitUntil(
            clients.matchAll().then(clients => {
                if (clients.length > 0) {
                    clients[0].postMessage({
                        action: action === 'start_break' ? 'START_BREAK' : 'START_FOCUS'
                    });
                    clients[0].focus();
                } else {
                    // Buka tab baru jika tidak ada yang terbuka
                    self.clients.openWindow('/');
                }
            })
        );
    }
});