export async function extractFacebookContent(url: string) {
  try {
    const response = await fetch('/api/import-fb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Error extracting FB content:", error);
    throw error;
  }
}

export async function formatManualContent(text: string) {
  try {
    const response = await fetch('/api/format-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      } else {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}...`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Error formatting manual content:", error);
    throw error;
  }
}
