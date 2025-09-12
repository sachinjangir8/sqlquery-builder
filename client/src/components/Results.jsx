import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Snackbar, Alert, Box, Typography } from "@mui/material";
import { ContentCopy, Check } from "@mui/icons-material";
import { useAppStore } from "../store";

export default function Results() {
  const { sql, rows } = useAppStore();
  const [copied, setCopied] = useState(false);
  const columns =
    rows && rows.length > 0
      ? Object.keys(rows[0]).map((k) => ({ field: k, headerName: k, flex: 1 }))
      : [];
  const gridRows = (rows || []).map((r, i) => ({ id: i, ...r }));

  const copyToClipboard = async () => {
    if (!sql) return;
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(sql);
        setCopied(true);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = sql;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          setCopied(true);
        } else {
          throw new Error("Copy command failed");
        }
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      // Show error message
      alert(
        "Failed to copy to clipboard. Please select and copy the text manually."
      );
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sql && (
        <Box sx={{ display: "grid", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">Generated SQL Query</Typography>
            <Button
              variant="outlined"
              startIcon={copied ? <Check /> : <ContentCopy />}
              onClick={copyToClipboard}
              color={copied ? "success" : "primary"}
              size="small"
            >
              {copied ? "Copied!" : "Copy SQL"}
            </Button>
          </Box>
          <pre
            style={{
              background: "#0b1021",
              color: "#d6deeb",
              padding: 12,
              borderRadius: 6,
              overflowX: "auto",
              margin: 0,
              fontSize: "14px",
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            }}
          >
            {sql}
          </pre>
        </Box>
      )}

      <div style={{ height: 360 }}>
        <DataGrid columns={columns} rows={gridRows} density="compact" />
      </div>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopied(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          SQL query copied to clipboard!
        </Alert>
      </Snackbar>
    </div>
  );
}
