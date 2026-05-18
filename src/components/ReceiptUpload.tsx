import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuthedFetch } from '../lib/api';

interface ReceiptUploadProps {
  value: string | null;
  onChange: (key: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export default function ReceiptUpload({ value, onChange, label = 'Receipt photo', disabled }: ReceiptUploadProps) {
  const authedFetch = useAuthedFetch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerPicker = () => inputRef.current?.click();

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const presignRes = await authedFetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${presignRes.status})`);
      }
      const { uploadUrl, fileKey } = (await presignRes.json()) as { uploadUrl: string; fileKey: string };

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`R2 upload failed (${putRes.status})`);
      }

      onChange(fileKey);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openReceipt = async () => {
    if (!value) return;
    try {
      const res = await authedFetch(`/api/storage?key=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error('Unable to load receipt');
      const { downloadUrl } = (await res.json()) as { downloadUrl: string };
      window.open(downloadUrl, '_blank', 'noopener');
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load receipt');
    }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFile}
        data-testid="receipt-upload-input"
      />
      {value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={openReceipt}
            data-testid="receipt-view-button"
          >
            View receipt
          </Button>
          <IconButton
            size="small"
            color="error"
            onClick={() => onChange(null)}
            disabled={disabled || uploading}
            aria-label="Remove receipt"
            data-testid="receipt-remove-button"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <Button
          variant="outlined"
          size="small"
          startIcon={<PhotoCameraIcon />}
          onClick={triggerPicker}
          disabled={disabled || uploading}
          data-testid="receipt-upload-button"
        >
          {uploading ? 'Uploading…' : 'Attach photo'}
        </Button>
      )}
      {uploading && <LinearProgress sx={{ mt: 1 }} />}
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
