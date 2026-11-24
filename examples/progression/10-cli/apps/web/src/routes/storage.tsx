import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/storage')({ component: Storage });

function Storage() {
  const [stored, setStored] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('file');
    if (!(file instanceof File) || !file.name || busy) return;
    setStored('');
    setBusy(true);
    try {
      const path = '/api/files/' + encodeURIComponent(file.name);
      const response = await fetch(path, { method: 'PUT', body: file });
      if (response.ok) setStored(path);
      setMessage(
        response.ok
          ? 'File stored.'
          : response.status === 401
            ? 'Sign in to upload.'
            : 'Upload failed. Check the file name, size, and storage configuration.',
      );
    } catch {
      setMessage('Storage is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <h1>Private files</h1>
      <form onSubmit={upload}>
        <label>
          Choose a file up to 1 MiB <input type="file" name="file" required />
        </label>
        <Button disabled={busy} type="submit">
          Upload
        </Button>
      </form>
      <p role="status">{message}</p>
      {stored && (
        <a href={stored} download>
          Download your file
        </a>
      )}
      <a href="/sign-in">Your account</a>
    </section>
  );
}
