import { useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { useAppStore } from "./store";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

export default function App() {
  const [authMode, setAuthMode] = useState("login");
  const { isAuthenticated, checkAuth } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Dashboard />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {authMode === "login" ? (
        <Login onSwitchToRegister={() => setAuthMode("register")} />
      ) : (
        <Register onSwitchToLogin={() => setAuthMode("login")} />
      )}
    </ThemeProvider>
  );
}



