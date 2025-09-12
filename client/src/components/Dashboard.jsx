import { useEffect } from "react";
import { Box, AppBar, Toolbar, Typography, Button, Container } from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import Upload from "./Upload";
import QueryBuilder from "./QueryBuilder";
import Results from "./Results";
import { useAppStore } from "../store";

export default function Dashboard() {
  const { user, logout, checkAuth } = useAppStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SQL Builder
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            Welcome, {user?.name}
          </Typography>
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "grid", gap: 3 }}>
          <Upload />
          <QueryBuilder />
          <Results />
        </Box>
      </Container>
    </Box>
  );
}
