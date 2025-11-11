const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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

export const fetchAdminTables = () =>
  fetch(`${API_BASE_URL}/api/admin/tables`, {
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse);

export const fetchTableData = (tableId) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}`, {
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse);

export const createRecord = (tableId, record) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  }).then(handleResponse);

export const updateRecord = (tableId, recordId, record) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record }),
  }).then(handleResponse);

export const deleteRecord = (tableId, recordId) =>
  fetch(`${API_BASE_URL}/api/admin/tables/${tableId}/${recordId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse);

export const fetchImageCategories = () =>
  fetch(`${API_BASE_URL}/api/admin/images`, {
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse);

export const fetchImages = (categoryId) =>
  fetch(`${API_BASE_URL}/api/admin/images?category=${encodeURIComponent(categoryId)}`, {
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse);

export const uploadImage = (categoryId, file) => {
  const formData = new FormData();
  formData.append('category', categoryId);
  formData.append('image', file);

  return fetch(`${API_BASE_URL}/api/admin/images`, {
    method: 'POST',
    body: formData,
  }).then(handleResponse);
};

export const deleteImageFile = (categoryId, filename) =>
  fetch(
    `${API_BASE_URL}/api/admin/images/${encodeURIComponent(categoryId)}/${encodeURIComponent(filename)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
  ).then(handleResponse);

