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
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Code as CodeIcon,
} from "@mui/icons-material";
import { api } from "../api";

export default function NormalizationAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalysis = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/normalization");
      setAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze normalization");
      console.error("Normalization analysis error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const getNormalFormStatus = (normalForm) => {
    if (normalForm.isValid) {
      return {
        icon: <CheckCircleIcon color="success" />,
        text: "Valid",
        color: "success",
      };
    } else {
      return {
        icon: <ErrorIcon color="error" />,
        text: "Issues Found",
        color: "error",
      };
    }
  };

  const getSuggestionIcon = (level) => {
    switch (level) {
      case "1NF":
        return <InfoIcon color="info" />;
      case "2NF":
        return <WarningIcon color="warning" />;
      case "3NF":
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon />;
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

  if (!analysis) {
    return null;
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Database Normalization Analysis
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This analysis checks your database against the three normal forms and
        provides suggestions for improvement.
      </Typography>

      {/* Normal Form Status Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              {getNormalFormStatus(analysis.analysis.firstNormalForm).icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                First Normal Form (1NF)
              </Typography>
            </Box>
            <Chip
              label={
                getNormalFormStatus(analysis.analysis.firstNormalForm).text
              }
              color={
                getNormalFormStatus(analysis.analysis.firstNormalForm).color
              }
              size="small"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Ensures atomic values and eliminates repeating groups
            </Typography>
            {analysis.analysis.firstNormalForm.tableViolations && 
             Object.keys(analysis.analysis.firstNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Tables with violations:
                </Typography>
                {Object.entries(analysis.analysis.firstNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Chip 
                    key={tableName}
                    label={`${tableName} (${violations.count} issues)`}
                    color="error"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              {getNormalFormStatus(analysis.analysis.secondNormalForm).icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                Second Normal Form (2NF)
              </Typography>
            </Box>
            <Chip
              label={
                getNormalFormStatus(analysis.analysis.secondNormalForm).text
              }
              color={
                getNormalFormStatus(analysis.analysis.secondNormalForm).color
              }
              size="small"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Eliminates partial dependencies on composite keys
            </Typography>
            {analysis.analysis.secondNormalForm.tableViolations && 
             Object.keys(analysis.analysis.secondNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Tables with violations:
                </Typography>
                {Object.entries(analysis.analysis.secondNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Chip 
                    key={tableName}
                    label={`${tableName} (${violations.count} issues)`}
                    color="error"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              {getNormalFormStatus(analysis.analysis.thirdNormalForm).icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                Third Normal Form (3NF)
              </Typography>
            </Box>
            <Chip
              label={
                getNormalFormStatus(analysis.analysis.thirdNormalForm).text
              }
              color={
                getNormalFormStatus(analysis.analysis.thirdNormalForm).color
              }
              size="small"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Eliminates transitive dependencies
            </Typography>
            {analysis.analysis.thirdNormalForm.tableViolations && 
             Object.keys(analysis.analysis.thirdNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="error" gutterBottom>
                  Tables with violations:
                </Typography>
                {Object.entries(analysis.analysis.thirdNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Chip 
                    key={tableName}
                    label={`${tableName} (${violations.count} issues)`}
                    color="error"
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Detailed Table Violations */}
      {(analysis.analysis.firstNormalForm.tableViolations && Object.keys(analysis.analysis.firstNormalForm.tableViolations).length > 0) ||
       (analysis.analysis.secondNormalForm.tableViolations && Object.keys(analysis.analysis.secondNormalForm.tableViolations).length > 0) ||
       (analysis.analysis.thirdNormalForm.tableViolations && Object.keys(analysis.analysis.thirdNormalForm.tableViolations).length > 0) ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <ErrorIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Detailed Table Violations
            </Typography>
            
            {/* 1NF Table Violations */}
            {analysis.analysis.firstNormalForm.tableViolations && 
             Object.keys(analysis.analysis.firstNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" color="error" gutterBottom>
                  1NF Violations by Table:
                </Typography>
                {Object.entries(analysis.analysis.firstNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Accordion key={`1nf-${tableName}`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        <strong>{tableName}</strong> - {violations.count} violation(s)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {violations.issues.map((issue, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <ErrorIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${issue.column} (Row ${issue.row})`}
                              secondary={`${issue.issue}: "${issue.value}"`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* 2NF Table Violations */}
            {analysis.analysis.secondNormalForm.tableViolations && 
             Object.keys(analysis.analysis.secondNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" color="warning.main" gutterBottom>
                  2NF Violations by Table:
                </Typography>
                {Object.entries(analysis.analysis.secondNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Accordion key={`2nf-${tableName}`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        <strong>{tableName}</strong> - {violations.count} violation(s)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {violations.issues.map((issue, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <WarningIcon color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${issue.column}`}
                              secondary={`${issue.issue}: ${issue.description}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* 3NF Table Violations */}
            {analysis.analysis.thirdNormalForm.tableViolations && 
             Object.keys(analysis.analysis.thirdNormalForm.tableViolations).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" color="error" gutterBottom>
                  3NF Violations by Table:
                </Typography>
                {Object.entries(analysis.analysis.thirdNormalForm.tableViolations).map(([tableName, violations]) => (
                  <Accordion key={`3nf-${tableName}`} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        <strong>{tableName}</strong> - {violations.count} violation(s)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {violations.issues.map((issue, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <ErrorIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${issue.column}`}
                              secondary={`${issue.issue}: ${issue.description}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Foreign Keys Detection */}
      {analysis.foreignKeys && analysis.foreignKeys.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <InfoIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Detected Foreign Keys
            </Typography>
            <List>
              {analysis.foreignKeys.map((fk, idx) => (
                <ListItem key={idx}>
                  <ListItemIcon>
                    <CodeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${fk.table}.${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`}
                    secondary={`Confidence: ${fk.confidence}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {analysis.analysis.suggestions &&
        analysis.analysis.suggestions.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <WarningIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Normalization Suggestions
              </Typography>
              {analysis.analysis.suggestions.map((suggestion, idx) => (
                <Accordion key={idx} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {getSuggestionIcon(suggestion.level)}
                      <Typography sx={{ ml: 1, fontWeight: "bold" }}>
                        {suggestion.issue}
                      </Typography>
                      <Chip
                        label={suggestion.level}
                        size="small"
                        sx={{ ml: 2 }}
                        color={
                          suggestion.level === "1NF"
                            ? "info"
                            : suggestion.level === "2NF"
                            ? "warning"
                            : "error"
                        }
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {suggestion.description}
                    </Typography>
                    {suggestion.recommendations &&
                      suggestion.recommendations.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Recommendations:
                          </Typography>
                          <List dense>
                            {suggestion.recommendations.map((rec, recIdx) => (
                              <ListItem key={recIdx}>
                                <ListItemText primary={rec} />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        )}

      {/* Constraint Violations */}
      {analysis.constraintViolations &&
        analysis.constraintViolations.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <ErrorIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                Constraint Violations
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Found {analysis.constraintViolations.length} constraint
                violations in your data
              </Alert>
              <List>
                {analysis.constraintViolations
                  .slice(0, 10)
                  .map((violation, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${violation.table}.${violation.column} (Row ${violation.row})`}
                        secondary={`${violation.type}: ${violation.message}`}
                      />
                    </ListItem>
                  ))}
                {analysis.constraintViolations.length > 10 && (
                  <ListItem>
                    <ListItemText
                      primary={`... and ${
                        analysis.constraintViolations.length - 10
                      } more violations`}
                      secondary="Use the generated SQL to fix these issues"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        )}

      {/* Generated SQL Statements */}
      {(analysis.sqlStatements && analysis.sqlStatements.length > 0) ||
      (analysis.constraintSQL && analysis.constraintSQL.length > 0) ? (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <CodeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              Generated SQL Statements
            </Typography>

            {/* Normalization SQL */}
            {analysis.sqlStatements &&
              analysis.sqlStatements.map((stmt, idx) => (
                <Accordion key={`norm-${idx}`} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {stmt.type}: {stmt.description}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        bgcolor: "grey.100",
                        p: 2,
                        borderRadius: 1,
                        overflow: "auto",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {stmt.sql}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}

            {/* Constraint SQL */}
            {analysis.constraintSQL &&
              analysis.constraintSQL.map((stmt, idx) => (
                <Accordion key={`constraint-${idx}`} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      {stmt.type}: {stmt.description}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      component="pre"
                      sx={{
                        bgcolor: "grey.100",
                        p: 2,
                        borderRadius: 1,
                        overflow: "auto",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {stmt.sql}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Refresh Button */}
      <Box sx={{ mt: 3, textAlign: "center" }}>
        <Button variant="outlined" onClick={fetchAnalysis} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "Refresh Analysis"}
        </Button>
      </Box>
    </Box>
  );
}
