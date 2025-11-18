// Use explicit URL if set, otherwise use direct URL (CORS enabled on backend)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
};

const jsonHeaders = (token, extra) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(extra || {}),
});

const authHeaders = (token, extra) => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  ...(extra || {}),
});

export const fetchAdminTables = (token) =>
  fetch(`${API_BASE_URL}/api/admin/tables`, {
    headers: jsonHeaders(token),
  }).then(handleResponse);

export const fetchTableData = (tableId, token) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}`, {
    headers: jsonHeaders(token),
  }).then(handleResponse);

export const createRecord = (tableId, record, token) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ record }),
  }).then(handleResponse);

export const updateRecord = (tableId, recordId, record, token) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}/${recordId}`, {
    method: 'PUT',
    headers: jsonHeaders(token),
    body: JSON.stringify({ record }),
  }).then(handleResponse);

export const deleteRecord = (tableId, recordId, token) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}/${recordId}`, {
    method: 'DELETE',
    headers: jsonHeaders(token),
  }).then(handleResponse);

export const fetchImageCategories = (token) =>
  fetch(`${API_BASE_URL}/api/admin/images`, {
    headers: jsonHeaders(token),
  }).then(handleResponse);

export const fetchImages = (categoryId, token) =>
  fetch(`${API_BASE_URL}/api/admin/images?category=${encodeURIComponent(categoryId)}`, {
    headers: jsonHeaders(token),
  }).then(handleResponse);

export const uploadImage = (categoryId, file, token) => {
  const formData = new FormData();
  formData.append('category', categoryId);
  formData.append('image', file);

  return fetch(`${API_BASE_URL}/api/admin/images`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData,
  }).then(handleResponse);
};

export const deleteImageFile = (categoryId, filename, token) =>
  fetch(
    `${API_BASE_URL}/api/admin/images/${encodeURIComponent(categoryId)}/${encodeURIComponent(filename)}`,
    {
      method: 'DELETE',
      headers: jsonHeaders(token),
    },
  ).then(handleResponse);

