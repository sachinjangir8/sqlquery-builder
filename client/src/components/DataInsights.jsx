import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  TableChart as TableChartIcon,
  DataUsage as DataUsageIcon,
  Insights as InsightsIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { api } from "../api";

export default function DataInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInsights = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/insights");
      setInsights(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch data insights");
      console.error("Data insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getQualityColor = (rate) => {
    if (rate >= 90) return "success";
    if (rate >= 70) return "warning";
    return "error";
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "error";
      case "MEDIUM":
        return "warning";
      case "LOW":
        return "info";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        <AnalyticsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
        Data Insights & Analytics
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Comprehensive analysis of your database including data quality,
        statistics, patterns, and relationships.
      </Typography>

      {/* Table Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TableChartIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Database Overview
          </Typography>
          <Grid container spacing={2}>
            {Object.entries(insights.tableOverview).map(
              ([tableName, overview]) => (
                <Grid item xs={12} md={6} lg={4} key={tableName}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {tableName}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">Rows:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {overview.rowCount.toLocaleString()}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">Columns:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {overview.columnCount}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">Primary Keys:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {overview.primaryKeys}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="body2">Foreign Keys:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {overview.foreignKeys}
                          </Typography>
                        </Box>
                        <Divider />
                        <Typography variant="subtitle2" gutterBottom>
                          Data Types:
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {Object.entries(overview.dataTypes).map(
                            ([type, count]) => (
                              <Chip
                                key={type}
                                label={`${type}: ${count}`}
                                size="small"
                                variant="outlined"
                              />
                            )
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Est. Size:{" "}
                          {overview.sizeEstimate.estimatedMB.toFixed(2)} MB
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Data Quality Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <DataUsageIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Data Quality Analysis
          </Typography>
          {Object.entries(insights.dataQuality).map(([tableName, quality]) => (
            <Accordion key={tableName} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{tableName}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {/* Completeness */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Completeness
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Column</TableCell>
                            <TableCell align="right">Rate</TableCell>
                            <TableCell align="right">Missing</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(quality.completeness).map(
                            ([columnName, metrics]) => (
                              <TableRow key={columnName}>
                                <TableCell>{columnName}</TableCell>
                                <TableCell align="right">
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <LinearProgress
                                      variant="determinate"
                                      value={metrics.completenessRate}
                                      color={getQualityColor(
                                        metrics.completenessRate
                                      )}
                                      sx={{ width: 60, height: 8 }}
                                    />
                                    <Typography variant="body2">
                                      {metrics.completenessRate.toFixed(1)}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  {metrics.nullCount}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>

                  {/* Uniqueness */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Uniqueness
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Column</TableCell>
                            <TableCell align="right">Rate</TableCell>
                            <TableCell align="right">Unique</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(quality.uniqueness).map(
                            ([columnName, metrics]) => (
                              <TableRow key={columnName}>
                                <TableCell>{columnName}</TableCell>
                                <TableCell align="right">
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                    }}
                                  >
                                    <LinearProgress
                                      variant="determinate"
                                      value={metrics.uniquenessRate}
                                      color={getQualityColor(
                                        metrics.uniquenessRate
                                      )}
                                      sx={{ width: 60, height: 8 }}
                                    />
                                    <Typography variant="body2">
                                      {metrics.uniquenessRate.toFixed(1)}%
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  {metrics.uniqueCount} /{" "}
                                  {metrics.totalNonNullCount}
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </CardContent>
      </Card>

      {/* Statistical Analysis */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Statistical Analysis
          </Typography>
          {Object.entries(insights.statisticalAnalysis).map(
            ([tableName, stats]) =>
              Object.keys(stats).length > 0 && (
                <Accordion key={tableName} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{tableName}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      {Object.entries(stats).map(
                        ([columnName, columnStats]) => (
                          <Grid item xs={12} md={6} key={columnName}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="h6" gutterBottom>
                                  {columnName}
                                </Typography>
                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Count: {columnStats.count}
                                    </Typography>
                                    <Typography variant="body2">
                                      Mean: {columnStats.mean.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2">
                                      Median: {columnStats.median.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2">
                                      Min: {columnStats.min}
                                    </Typography>
                                    <Typography variant="body2">
                                      Max: {columnStats.max}
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="body2">
                                      Std Dev:{" "}
                                      {columnStats.standardDeviation.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2">
                                      Variance:{" "}
                                      {columnStats.variance.toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2">
                                      Range: {columnStats.range.toFixed(2)}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color={
                                        columnStats.outliers.length > 0
                                          ? "error"
                                          : "text.secondary"
                                      }
                                    >
                                      Outliers: {columnStats.outliers.length}
                                    </Typography>
                                  </Grid>
                                </Grid>
                                {columnStats.outliers.length > 0 && (
                                  <Alert severity="warning" sx={{ mt: 1 }}>
                                    Found {columnStats.outliers.length}{" "}
                                    outliers:{" "}
                                    {columnStats.outliers
                                      .slice(0, 5)
                                      .join(", ")}
                                    {columnStats.outliers.length > 5 && "..."}
                                  </Alert>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      )}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              )
          )}
        </CardContent>
      </Card>

      {/* Pattern Detection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <TrendingUpIcon sx={{ mr: 1, verticalAlign: "middle" }} />
            Pattern Detection
          </Typography>
          {Object.entries(insights.patternDetection).map(
            ([tableName, patterns]) => (
              <Accordion key={tableName} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">
                    {tableName}
                    {patterns.duplicates.length > 0 && (
                      <Chip
                        label={`${patterns.duplicates.length} duplicates`}
                        color="error"
                        size="small"
                        sx={{ ml: 2 }}
                      />
                    )}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {patterns.duplicates.length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="error">
                          <Typography variant="subtitle2" gutterBottom>
                            Duplicate Rows Found: {patterns.duplicates.length}
                          </Typography>
                          <Typography variant="body2">
                            Rows:{" "}
                            {patterns.duplicates
                              .slice(0, 10)
                              .map((d) => d.index)
                              .join(", ")}
                            {patterns.duplicates.length > 10 && "..."}
                          </Typography>
                        </Alert>
                      </Grid>
                    )}

                    {patterns.anomalies.length > 0 && (
                      <Grid item xs={12}>
                        <Alert severity="warning">
                          <Typography variant="subtitle2" gutterBottom>
                            Anomalies Detected: {patterns.anomalies.length}
                          </Typography>
                          <List dense>
                            {patterns.anomalies
                              .slice(0, 5)
                              .map((anomaly, idx) => (
                                <ListItem key={idx}>
                                  <ListItemIcon>
                                    <WarningIcon color="warning" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={`${anomaly.column}: ${anomaly.value}`}
                                    secondary={anomaly.type}
                                  />
                                </ListItem>
                              ))}
                          </List>
                        </Alert>
                      </Grid>
                    )}

                    {patterns.correlations.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>
                          Strong Correlations Found:
                        </Typography>
                        <List dense>
                          {patterns.correlations.map((corr, idx) => (
                            <ListItem key={idx}>
                              <ListItemIcon>
                                <TrendingUpIcon color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${corr.column1} ↔ ${corr.column2}`}
                                secondary={`${
                                  corr.strength
                                } correlation: ${corr.correlation.toFixed(3)}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            )
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <InsightsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Data Recommendations
            </Typography>
            <List>
              {insights.recommendations.map((rec, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    {rec.priority === "HIGH" ? (
                      <ErrorIcon color="error" />
                    ) : rec.priority === "MEDIUM" ? (
                      <WarningIcon color="warning" />
                    ) : (
                      <InfoIcon color="info" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1">{rec.issue}</Typography>
                        <Chip
                          label={rec.priority}
                          color={getPriorityColor(rec.priority)}
                          size="small"
                        />
                        <Chip
                          label={rec.type}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {rec.description}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          💡 {rec.suggestion}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Button variant="outlined" onClick={fetchInsights} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Refresh Insights"}
        </Button>
      </Box>
    </Box>
  );
}

