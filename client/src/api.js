import axios from "axios";

// Use relative URL for production (same domain), absolute for development
const baseURL = import.meta.env.PROD ? "/api" : "http://localhost:4000/api";

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

export async function uploadFiles(files) {
  console.log(
    "Uploading files:",
    files.map((f) => f.name)
  );
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  console.log("Upload response:", res.data);
  return res.data;
}

export async function fetchSchema() {
  console.log("Fetching schema...");
  const res = await api.get("/schema");
  console.log("Schema response:", res.data);
  return res.data;
}

export async function runQuery(builder) {
  console.log("Running query:", builder);
  const res = await api.post("/query", builder);
  console.log("Query response:", res.data);
  return res.data;
}

export async function fetchNormalizationAnalysis() {
  console.log("Fetching normalization analysis...");
  const res = await api.get("/normalization");
  console.log("Normalization analysis response:", res.data);
  return res.data;
}

export async function fetchDataInsights() {
  console.log("Fetching data insights...");
  const res = await api.get("/insights");
  console.log("Data insights response:", res.data);
  return res.data;
}
