import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studyforge.auth',
  appName: 'Study Forge',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
