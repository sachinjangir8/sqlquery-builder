import { useState } from 'react';
import { Button, Alert, CircularProgress } from '@mui/material';
import { uploadFiles, fetchSchema } from '../api';
import { useAppStore } from '../store';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSchema = useAppStore((s) => s.setSchema);

  const onUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    setError('');
    try {
      await uploadFiles(files);
      const data = await fetchSchema();
      setSchema(data);
    } catch (err) {
      setError(err.message || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <input 
          type="file" 
          multiple 
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFiles(Array.from(e.target.files || []))} 
        />
        <Button 
          variant="contained" 
          onClick={onUpload}
          disabled={!files.length || loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Upload'}
        </Button>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      {files.length > 0 && (
        <div>Selected: {files.map(f => f.name).join(', ')}</div>
      )}
    </div>
  );
}
