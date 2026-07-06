import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.datao.campo",
  appName: "Dataº Campo",
  webDir: "dist",
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      iosIsEncryption: false,
    },
  },
};

export default config;
