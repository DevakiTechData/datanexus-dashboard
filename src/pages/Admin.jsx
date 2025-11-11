import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdminTables,
  fetchTableData,
  createRecord,
  updateRecord,
  deleteRecord,
  fetchImageCategories,
  fetchImages,
  uploadImage,
  deleteImageFile,
} from '../services/adminApi';

const initialStatus = { type: null, message: '' };

const Admin = () => {
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [tableMeta, setTableMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [formMode, setFormMode] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tables');
  const [imageCategories, setImageCategories] = useState([]);
  const [selectedImageCategory, setSelectedImageCategory] = useState('');
  const [imageItems, setImageItems] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageStatus, setImageStatus] = useState(initialStatus);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const loadImagesForCategory = async (categoryId) => {
    if (!categoryId) {
      setImageItems([]);
      return;
    }
    setImageLoading(true);
    setImageStatus(initialStatus);
    try {
      const data = await fetchImages(categoryId);
      setImageItems(data.files ?? []);
    } catch (error) {
      setImageStatus({ type: 'error', message: error.message });
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    const loadTables = async () => {
      try {
        const list = await fetchAdminTables();
        setTables(list);
        if (list.length > 0) {
          setSelectedTableId(list[0].id);
        }
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      }
    };
    loadTables();
  }, []);

  useEffect(() => {
    const loadTableData = async () => {
      if (!selectedTableId) return;
      setLoading(true);
      setStatus(initialStatus);
      try {
        const data = await fetchTableData(selectedTableId);
        setTableMeta(data);
        setRows(data.rows);
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      } finally {
        setLoading(false);
      }
    };
    loadTableData();
  }, [selectedTableId]);

useEffect(() => {
  if (activeTab !== 'images') return undefined;

  let ignore = false;
  const loadCategories = async () => {
    setImageStatus(initialStatus);
    try {
      const categories = await fetchImageCategories();
      if (ignore) return;
      setImageCategories(categories);
      setSelectedImageCategory((current) => {
        if (current && categories.some((cat) => cat.id === current)) {
          return current;
        }
        return categories[0]?.id ?? '';
      });
      if (categories.length === 0) {
        setImageItems([]);
      }
    } catch (error) {
      if (!ignore) {
        setImageStatus({ type: 'error', message: error.message });
      }
    }
  };

  loadCategories();

  return () => {
    ignore = true;
  };
}, [activeTab]);

useEffect(() => {
  if (activeTab !== 'images') return;
  if (!selectedImageCategory) {
    setImageItems([]);
    return;
  }
  loadImagesForCategory(selectedImageCategory);
}, [activeTab, selectedImageCategory]);

  const activeTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId),
    [tables, selectedTableId],
  );

  const columns = tableMeta?.columns ?? [];
  const primaryKey = tableMeta?.primaryKey ?? '';

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      columns.some((column) => (row[column] ?? '').toLowerCase().includes(term)),
    );
  }, [rows, columns, searchTerm]);

  const resetFormState = () => {
    setFormMode(null);
    setFormValues({});
  };

  const handleOpenForm = (mode, row = null) => {
    setFormMode(mode);
    if (mode === 'edit' && row) {
      setFormValues(row);
    } else {
      const emptyRecord = columns.reduce((acc, column) => {
        acc[column] = '';
        return acc;
      }, {});
      setFormValues(emptyRecord);
    }
  };

  const handleFormChange = (column, value) => {
    setFormValues((prev) => ({
      ...prev,
      [column]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formMode || !tableMeta) return;

    const trimmedRecord = columns.reduce((acc, column) => {
      const value = formValues[column];
      acc[column] = value === undefined || value === null ? '' : value;
      return acc;
    }, {});

    const keyValue = trimmedRecord[primaryKey];
    if (!keyValue) {
      setStatus({
        type: 'error',
        message: `Field "${primaryKey}" is required.`,
      });
      return;
    }

    setStatus(initialStatus);
    setLoading(true);
    try {
      if (formMode === 'add') {
        await createRecord(selectedTableId, trimmedRecord);
        setStatus({ type: 'success', message: 'Record added successfully.' });
      } else if (formMode === 'edit') {
        await updateRecord(selectedTableId, keyValue, trimmedRecord);
        setStatus({ type: 'success', message: 'Record updated successfully.' });
      }
      const data = await fetchTableData(selectedTableId);
      setTableMeta(data);
      setRows(data.rows);
      resetFormState();
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!tableMeta) return;
    const keyValue = row[primaryKey];
    const confirmed = window.confirm(
      `Are you sure you want to delete record with ${primaryKey}="${keyValue}"?`,
    );
    if (!confirmed) return;
    setLoading(true);
    setStatus(initialStatus);
    try {
      await deleteRecord(selectedTableId, keyValue);
      setStatus({ type: 'success', message: 'Record deleted successfully.' });
      setRows((prev) => prev.filter((item) => item[primaryKey] !== keyValue));
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    if (!selectedImageCategory) {
      setImageStatus({ type: 'error', message: 'Select an image category first.' });
      return;
    }
    if (!selectedFile) {
      setImageStatus({ type: 'error', message: 'Choose an image file to upload.' });
      return;
    }
    const form = event.target;
    setUploading(true);
    try {
      await uploadImage(selectedImageCategory, selectedFile);
      await loadImagesForCategory(selectedImageCategory);
      const categories = await fetchImageCategories();
      setImageCategories(categories);
      setSelectedImageCategory((current) => {
        if (current && categories.some((cat) => cat.id === current)) {
          return current;
        }
        return categories[0]?.id ?? '';
      });
      setImageStatus({ type: 'success', message: 'Image uploaded successfully.' });
      setSelectedFile(null);
      form.reset();
    } catch (error) {
      setImageStatus({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (filename) => {
    if (!selectedImageCategory) return;
    const confirmed = window.confirm(`Delete "${filename}" from ${selectedImageCategory}?`);
    if (!confirmed) return;
    setImageStatus(initialStatus);
    try {
      await deleteImageFile(selectedImageCategory, filename);
      await loadImagesForCategory(selectedImageCategory);
      const categories = await fetchImageCategories();
      setImageCategories(categories);
      setSelectedImageCategory((current) => {
        if (current && categories.some((cat) => cat.id === current)) {
          return current;
        }
        return categories[0]?.id ?? '';
      });
      setImageStatus({ type: 'success', message: 'Image deleted successfully.' });
    } catch (error) {
      setImageStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-sluGold font-semibold">
              Admin Console
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-sluBlue">
              Manage DataNexus Assets
            </h1>
            <p className="text-slate-600 max-w-3xl">
              Maintain the data tables and media library that power the dashboards. Updates made here
              are saved directly into the project files for immediate use across the experience.
            </p>
          </div>
          {activeTab === 'tables' && tables.length > 0 && (
            <div className="flex flex-col gap-2 w-full md:w-72">
              <label className="text-sm font-medium text-slate-600">Select a data table</label>
              <select
                value={selectedTableId}
                onChange={(event) => setSelectedTableId(event.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-sluBlue focus:ring focus:ring-sluBlue/20 transition"
              >
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'tables'
                ? 'bg-sluBlue text-white shadow'
                : 'bg-white text-sluBlue border border-sluBlue/40 hover:bg-sluBlue/10'
            }`}
          >
            Data Tables
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === 'images'
                ? 'bg-sluBlue text-white shadow'
                : 'bg-white text-sluBlue border border-sluBlue/40 hover:bg-sluBlue/10'
            }`}
          >
            Image Library
          </button>
        </div>

        {activeTab === 'tables' && activeTable && (
          <section className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{activeTable.label}</h2>
                <p className="text-sm text-slate-500 max-w-3xl">
                  {tableMeta?.description || activeTable.description}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                  Primary Key: {tableMeta?.primaryKey}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Quick search…"
                  className="w-full sm:w-64 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sluBlue focus:ring focus:ring-sluBlue/20 transition"
                />
                <button
                  type="button"
                  onClick={() => handleOpenForm('add')}
                  className="inline-flex items-center justify-center rounded-lg bg-sluBlue text-white px-4 py-2 text-sm font-semibold shadow hover:bg-sluBlue/90 transition"
                >
                  + Add Record
                </button>
              </div>
            </div>

            {status.type && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  status.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {status.message}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-xs text-slate-600"
                      >
                        {column}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-semibold uppercase tracking-wide text-xs text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        Loading data…
                      </td>
                    </tr>
                  ) : filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="px-4 py-10 text-center text-slate-500"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row[primaryKey] ?? Math.random()}>
                        {columns.map((column) => (
                          <td key={`${row[primaryKey]}-${column}`} className="px-4 py-3 text-slate-700">
                            <span className="whitespace-pre-wrap break-words">
                              {row[column] ?? ''}
                            </span>
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right text-sm">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenForm('edit', row)}
                              className="text-sluBlue hover:text-sluBlue/80 font-semibold"
                            >
                              Edit
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(row)}
                              className="text-red-500 hover:text-red-400 font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'images' && (
          <section className="mt-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-800">Image Library</h2>
                <p className="text-sm text-slate-500 max-w-3xl">
                  Organize hero banners, alumni spotlights, employer imagery, and custom uploads.
                  Assets stored here are available immediately for dashboards and pages.
                </p>
              </div>
              {imageCategories.length > 0 && (
                <div className="flex flex-col gap-2 w-full md:w-72">
                  <label className="text-sm font-medium text-slate-600">Image category</label>
                  <select
                    value={selectedImageCategory}
                    onChange={(event) => setSelectedImageCategory(event.target.value)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-sluBlue focus:ring focus:ring-sluBlue/20 transition"
                  >
                    {imageCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <form
              onSubmit={handleUploadSubmit}
              className="flex flex-col md:flex-row md:items-center gap-4 border border-slate-200 rounded-xl px-4 py-4 bg-slate-50"
            >
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-600 mb-1 block">
                  Upload new image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-sluBlue hover:file:bg-sluBlue/10"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Supported formats: JPG, PNG, WebP. Max file size 10 MB.
                </p>
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center justify-center rounded-lg bg-sluBlue text-white px-5 py-2 text-sm font-semibold shadow hover:bg-sluBlue/90 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? 'Uploading…' : 'Upload Image'}
              </button>
            </form>

            {imageStatus.type && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  imageStatus.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {imageStatus.message}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">
                  {imageCategories.find((cat) => cat.id === selectedImageCategory)?.label ??
                    'Images'}
                </h3>
                {selectedImageCategory && (
                  <span className="text-sm text-slate-500">
                    {imageItems.length} file{imageItems.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {imageLoading ? (
                <div className="py-12 text-center text-slate-500">Loading images…</div>
              ) : imageItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl">
                  No images in this category yet. Upload a new asset to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {imageItems.map((image) => (
                    <article
                      key={image.filename}
                      className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition"
                    >
                      <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-4 space-y-2 text-sm text-slate-600">
                        <p className="font-semibold text-slate-800 break-words">{image.filename}</p>
                        <p className="text-xs text-slate-400">
                          {(image.size / 1024).toFixed(1)} KB · Updated{' '}
                          {new Date(image.updatedAt).toLocaleString()}
                        </p>
                        <div className="flex justify-between items-center">
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sluBlue hover:text-sluBlue/80 font-semibold"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteImage(image.filename)}
                            className="text-red-500 hover:text-red-400 font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {formMode && activeTab === 'tables' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[85vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {formMode === 'add' ? 'Add New Record' : 'Edit Record'}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {activeTable?.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetFormState}
                  className="text-slate-500 hover:text-slate-700 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 max-h-[70vh] space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {columns.map((column) => (
                    <div key={column} className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {column}
                      </label>
                      <textarea
                        value={formValues[column] ?? ''}
                        onChange={(event) => handleFormChange(column, event.target.value)}
                        disabled={formMode === 'edit' && column === primaryKey}
                        className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-sluBlue focus:ring focus:ring-sluBlue/20 transition"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={resetFormState}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-sluBlue text-white px-5 py-2 text-sm font-semibold shadow hover:bg-sluBlue/90 transition"
                  >
                    {formMode === 'add' ? 'Add Record' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;

