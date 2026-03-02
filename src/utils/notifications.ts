export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('Bu tarayıcı bildirimleri desteklemiyor');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

export const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            ...options
        });
    }
};

export const notifyMaintenanceDue = (plate: string, km: number) => {
    sendNotification('Bakım Zamanı', {
        body: `${plate} aracı bakım zamanı yaklaşmış (${km} km)`,
        tag: 'maintenance',
        requireInteraction: true
    });
};

export const notifyNewBooking = (customerName: string, plate: string) => {
    sendNotification('Yeni Rezervasyon', {
        body: `${customerName} - ${plate} için yeni rezervasyon`,
        tag: 'booking'
    });
};

export const notifyLongRental = (plate: string, days: number) => {
    sendNotification('Uzun Süreli Kiralama', {
        body: `${plate} ${days} gündür kirada`,
        tag: 'long-rental',
        requireInteraction: true
    });
};

export const scheduleMaintenanceReminder = (_vehicleId: string, plate: string, daysUntil: number) => {
    // In a real app, this would use Firebase Cloud Messaging or similar
    console.log(`Bakım hatırlatıcı planlandı: ${plate} için ${daysUntil} gün sonra`);
};
