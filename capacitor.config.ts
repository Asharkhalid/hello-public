import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hello.test.com',
  appName: 'hello',
  webDir: "dist",
  server: {
      "url": "https://hello-six-beige.vercel.app",
      "cleartext": true
  },
};

export default config;
