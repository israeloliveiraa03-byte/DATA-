// Navegação do app: máquina de estados simples com 4 telas — sem router,
// de propósito (o fluxo é linear e raso; um router seria peso morto aqui).

import { useEffect, useState } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { ResearchListScreen } from "./screens/ResearchListScreen";
import { FormFillScreen } from "./screens/FormFillScreen";
import { FieldCaptureScreen } from "./screens/FieldCaptureScreen";
import { getStoredToken } from "./lib/api";
import { initLocalDb, getCachedForm } from "./lib/localDb";
import { registerSyncTriggers, runSync } from "./lib/syncWorker";
import type { ApiForm } from "./lib/types";

type Screen =
  | { name: "loading" }
  | { name: "login" }
  | { name: "researches" }
  | { name: "form"; form: ApiForm }
  | { name: "capture" };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "loading" });

  useEffect(() => {
    void (async () => {
      await initLocalDb();
      registerSyncTriggers();
      const token = await getStoredToken();
      setScreen(token ? { name: "researches" } : { name: "login" });
      // Aproveita a abertura do app pra tentar drenar pendências.
      if (token) void runSync();
    })();
  }, []);

  async function openForm(researchId: string) {
    const form = await getCachedForm(researchId);
    if (form) setScreen({ name: "form", form });
  }

  switch (screen.name) {
    case "loading":
      return (
        <div className="screen" style={{ textAlign: "center", paddingTop: 80 }}>
          <span className="spinner" />
        </div>
      );
    case "login":
      return <LoginScreen onLoggedIn={() => setScreen({ name: "researches" })} />;
    case "researches":
      return (
        <ResearchListScreen
          onOpenForm={id => void openForm(id)}
          onOpenCapture={() => setScreen({ name: "capture" })}
          onLogout={() => setScreen({ name: "login" })}
        />
      );
    case "form":
      return (
        <FormFillScreen
          form={screen.form}
          onDone={() => setScreen({ name: "researches" })}
          onBack={() => setScreen({ name: "researches" })}
        />
      );
    case "capture":
      return <FieldCaptureScreen onBack={() => setScreen({ name: "researches" })} />;
  }
}
