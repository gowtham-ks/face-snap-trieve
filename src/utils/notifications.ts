export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
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
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...options,
    });
  }
};

export const notifyFaceRecognized = (name: string, confidence: number) => {
  sendNotification('Face Recognized!', {
    body: `${name} detected with ${(confidence * 100).toFixed(1)}% confidence`,
    tag: 'face-recognition',
    requireInteraction: false,
  });
};

export const notifyUserRegistered = (name: string) => {
  sendNotification('User Registered', {
    body: `${name} has been successfully registered`,
    tag: 'user-registration',
  });
};
