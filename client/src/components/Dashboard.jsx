import { useEffect, useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  TableChart as TableChartIcon,
  Analytics as AnalyticsIcon,
  Insights as InsightsIcon,
} from "@mui/icons-material";
import Upload from "./Upload";
import QueryBuilder from "./QueryBuilder";
import Results from "./Results";
import NormalizationAnalysis from "./NormalizationAnalysis";
import DataInsights from "./DataInsights";
import { useAppStore } from "../store";

export default function Dashboard() {
  const { user, logout, checkAuth } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
          <Button
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab
              icon={<TableChartIcon />}
              label="Query Builder"
              iconPosition="start"
            />
            <Tab
              icon={<AnalyticsIcon />}
              label="Normalization Analysis"
              iconPosition="start"
            />
            <Tab
              icon={<InsightsIcon />}
              label="Data Insights"
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box sx={{ display: "grid", gap: 3 }}>
            <Upload />
            <QueryBuilder />
            <Results />
          </Box>
        )}

        {activeTab === 1 && <NormalizationAnalysis />}

        {activeTab === 2 && <DataInsights />}
      </Container>
    </Box>
  );
}
