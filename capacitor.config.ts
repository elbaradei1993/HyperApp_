import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hyperapp.mimi',
  appName: 'HyperApp Mimi',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#3b82f6',
      sound: 'default'
    }
  }
};

export default config;
