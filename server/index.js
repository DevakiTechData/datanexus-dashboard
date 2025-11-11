import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import Papa from 'papaparse';
import multer from 'multer';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_ROOT = path.join(PROJECT_ROOT, 'datanexus-dashboard', 'public');
const EXCEL_PATH = path.join(DATA_DIR, 'event_inquiries.xlsx');
const SHEET_NAME = 'Inquiries';

const HEADER_CONFIG = [
  { key: 'submittedAt', heading: 'Submitted At' },
  { key: 'firstName', heading: 'First Name' },
  { key: 'lastName', heading: 'Last Name' },
  { key: 'email', heading: 'Email' },
  { key: 'phone', heading: 'Phone Number' },
  { key: 'audienceType', heading: 'Audience Type' },
  { key: 'companyName', heading: 'Company Name' },
  { key: 'studentId', heading: 'Student ID' },
  { key: 'currentCompany', heading: 'Current Company' },
  { key: 'relationshipInterest', heading: 'Relationship Interest' },
  { key: 'applicationsSubmitted', heading: 'Applications Submitted' },
  { key: 'upcomingEventId', heading: 'Upcoming Event' },
  { key: 'notes', heading: 'Notes' },
];

const ensureDataDirectory = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

const loadExistingRows = () => {
  if (!fs.existsSync(EXCEL_PATH)) {
    return [];
  }
  const workbook = XLSX.readFile(EXCEL_PATH);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const existing = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  return existing.map((row) => ({
    submittedAt: row['Submitted At'] ?? '',
    firstName: row['First Name'] ?? '',
    lastName: row['Last Name'] ?? '',
    email: row['Email'] ?? '',
    phone: row['Phone Number'] ?? '',
    audienceType: row['Audience Type'] ?? '',
    companyName: row['Company Name'] ?? '',
    studentId: row['Student ID'] ?? '',
    currentCompany: row['Current Company'] ?? '',
    relationshipInterest: row['Relationship Interest'] ?? '',
    applicationsSubmitted: row['Applications Submitted'] ?? '',
    upcomingEventId: row['Upcoming Event'] ?? '',
    notes: row['Notes'] ?? '',
  }));
};

const writeRowsToWorkbook = (rows) => {
  const headerRow = HEADER_CONFIG.map((col) => col.heading);
  const dataRows = rows.map((row) =>
    HEADER_CONFIG.map((col) => (row[col.key] !== undefined ? row[col.key] : '')),
  );

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  XLSX.writeFile(workbook, EXCEL_PATH);
};

const appendInquiryToExcel = (inquiry) => {
  ensureDataDirectory();
  const rows = loadExistingRows();
  rows.push(inquiry);
  writeRowsToWorkbook(rows);
};

const ADMIN_TABLES = {
  students: {
    label: 'Students',
    description: 'Core student roster and program details.',
    filePath: path.join(CSV_ROOT, 'Dim_Students.csv'),
    primaryKey: 'student_key',
  },
  employers: {
    label: 'Employers',
    description: 'Employer directory with industry and location details.',
    filePath: path.join(CSV_ROOT, 'dim_employers.csv'),
    primaryKey: 'employer_key',
  },
  contacts: {
    label: 'Contacts',
    description: 'Primary employer contacts engaged with SLU.',
    filePath: path.join(CSV_ROOT, 'dim_contact.csv'),
    primaryKey: 'contact_key',
  },
  events: {
    label: 'Events',
    description: 'Engagement events and experiential opportunities.',
    filePath: path.join(CSV_ROOT, 'dim_event.csv'),
    primaryKey: 'event_key',
  },
  dates: {
    label: 'Dates',
    description: 'Date dimension used for analytics across dashboards.',
    filePath: path.join(CSV_ROOT, 'dim_date.csv'),
    primaryKey: 'date_key',
  },
  alumniEngagement: {
    label: 'Alumni Engagement Facts',
    description: 'Fact table tracking alumni interactions and hiring outcomes.',
    filePath: path.join(CSV_ROOT, 'fact_alumni_engagement.csv'),
    primaryKey: 'fact_id',
  },
};

const createImageCategory = (relativePath, label, description) => ({
  label,
  description,
  relativePath,
  absolutePath: path.join(CSV_ROOT, relativePath),
  publicPath: `/${relativePath.replace(/\\/g, '/')}`,
});

const IMAGE_CATEGORIES = {
  alumni: createImageCategory(
    path.join('assets', 'alumni'),
    'Alumni & Students',
    'Images of SLU alumni, students, and engagement spotlights.',
  ),
  employers: createImageCategory(
    path.join('assets', 'employers'),
    'Employer Partners',
    'Logos and photography for DataNexus corporate partners.',
  ),
  hero: createImageCategory(
    path.join('assets', 'hero'),
    'Hero & Slider',
    'Hero banner imagery used throughout the experience.',
  ),
  uploads: createImageCategory(
    path.join('assets', 'uploads'),
    'Custom Uploads',
    'General purpose uploads provided by administrators.',
  ),
};

const ensureImageDirectories = () => {
  Object.values(IMAGE_CATEGORIES).forEach((category) => {
    if (!fs.existsSync(category.absolutePath)) {
      fs.mkdirSync(category.absolutePath, { recursive: true });
    }
  });
};

ensureImageDirectories();

const getTableConfig = (tableId) => {
  const config = ADMIN_TABLES[tableId];
  if (!config) {
    const error = new Error(`Table "${tableId}" not found.`);
    error.status = 404;
    throw error;
  }
  if (!fs.existsSync(config.filePath)) {
    const error = new Error(`Source file for "${tableId}" does not exist.`);
    error.status = 404;
    throw error;
  }
  return config;
};

const loadTableData = (tableId) => {
  const config = getTableConfig(tableId);
  const csvString = fs.readFileSync(config.filePath, 'utf-8');
  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => (value ?? '').toString(),
  });

  const columns = parsed.meta.fields || [];
  const rows = parsed.data.map((row) => {
    const normalized = {};
    columns.forEach((column) => {
      normalized[column] = row[column] ?? '';
    });
    return normalized;
  });

  return {
    config,
    columns,
    rows,
  };
};

const writeTableData = (tableId, columns, rows) => {
  const config = getTableConfig(tableId);
  const csv = Papa.unparse(rows, { columns });
  fs.writeFileSync(config.filePath, csv, 'utf-8');
};

const sanitizeRecord = (columns, record) => {
  const sanitized = {};
  columns.forEach((column) => {
    const value = record[column];
    sanitized[column] =
      value === undefined || value === null ? '' : value.toString().trim();
  });
  return sanitized;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const getImageCategory = (categoryId) => {
  const category = IMAGE_CATEGORIES[categoryId];
  if (!category) {
    const error = new Error(`Image category "${categoryId}" not found.`);
    error.status = 404;
    throw error;
  }
  return category;
};

const listImageFiles = (categoryId) => {
  const category = getImageCategory(categoryId);
  const files = fs.existsSync(category.absolutePath)
    ? fs.readdirSync(category.absolutePath).filter((name) => !name.startsWith('.'))
    : [];

  return files.map((filename) => {
    const filePath = path.join(category.absolutePath, filename);
    const stats = fs.statSync(filePath);
    return {
      filename,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
      url: `${category.publicPath}/${encodeURIComponent(filename)}`,
    };
  });
};

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/inquiries', (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone = '',
      audienceType,
      companyName = '',
      studentId = '',
      currentCompany = '',
      relationshipInterest = false,
      applicationsSubmitted = 0,
      upcomingEventId = '',
      notes = '',
    } = req.body ?? {};

    if (!firstName || !lastName || !email || !audienceType) {
      return res
        .status(400)
        .json({ error: 'firstName, lastName, email and audienceType are required.' });
    }

    const formattedRow = {
      submittedAt: new Date().toISOString(),
      firstName,
      lastName,
      email,
      phone,
      audienceType,
      companyName: audienceType === 'employer' ? companyName : '',
      studentId: audienceType === 'alumni' ? studentId : '',
      currentCompany: audienceType === 'alumni' ? currentCompany : '',
      relationshipInterest: relationshipInterest ? 'Yes' : 'No',
      applicationsSubmitted: Number(applicationsSubmitted || 0),
      upcomingEventId,
      notes,
    };

    appendInquiryToExcel(formattedRow);
    res.status(201).json({ message: 'Inquiry stored successfully in Excel.' });
  } catch (error) {
    console.error('Failed to store inquiry', error);
    res.status(500).json({ error: 'Failed to store inquiry.' });
  }
});

app.get('/api/admin/images', (req, res) => {
  try {
    const { category } = req.query ?? {};

    if (category) {
      const categoryInfo = getImageCategory(category);
      const files = listImageFiles(category);
      return res.json({
        category: {
          id: category,
          label: categoryInfo.label,
          description: categoryInfo.description,
          primaryPath: categoryInfo.publicPath,
        },
        files,
      });
    }

    const categories = Object.entries(IMAGE_CATEGORIES).map(([id, categoryInfo]) => {
      const files = listImageFiles(id);
      return {
        id,
        label: categoryInfo.label,
        description: categoryInfo.description,
        count: files.length,
        publicPath: categoryInfo.publicPath,
      };
    });

    res.json(categories);
  } catch (error) {
    console.error('Failed to load image categories', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to load images.' });
  }
});

app.post('/api/admin/images', upload.single('image'), (req, res) => {
  try {
    const { category } = req.body ?? {};
    if (!category) {
      return res.status(400).json({ error: 'Category is required.' });
    }
    const categoryInfo = getImageCategory(category);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    const originalName = file.originalname || 'upload';
    const parsed = path.parse(originalName);
    const safeBase = parsed.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'image';
    const extension = parsed.ext || '.png';

    let filename = `${safeBase}${extension}`;
    const targetDir = categoryInfo.absolutePath;
    let counter = 1;
    while (fs.existsSync(path.join(targetDir, filename))) {
      filename = `${safeBase}_${Date.now()}_${counter}${extension}`;
      counter += 1;
    }

    fs.writeFileSync(path.join(targetDir, filename), file.buffer);

    const fileInfo = listImageFiles(category).find((item) => item.filename === filename);
    res.status(201).json({ message: 'Image uploaded successfully.', file: fileInfo });
  } catch (error) {
    console.error('Failed to upload image', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to upload image.' });
  }
});

app.delete('/api/admin/images/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const categoryInfo = getImageCategory(category);
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(categoryInfo.absolutePath, decodedFilename);

    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: `Image "${decodedFilename}" not found in category "${category}".` });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Image deleted successfully.' });
  } catch (error) {
    console.error('Failed to delete image', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete image.' });
  }
});

app.get('/api/admin/tables', (req, res) => {
  try {
    const tables = Object.entries(ADMIN_TABLES).map(([id, tableConfig]) => {
      const { columns } = loadTableData(id);
      return {
        id,
        label: tableConfig.label,
        description: tableConfig.description,
        primaryKey: tableConfig.primaryKey,
        columns,
      };
    });
    res.json(tables);
  } catch (error) {
    console.error('Failed to load admin tables', error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to load tables.' });
  }
});

app.get('/api/admin/tables/:tableId', (req, res) => {
  try {
    const { tableId } = req.params;
    const { config, columns, rows } = loadTableData(tableId);
    res.json({
      label: config.label,
      description: config.description,
      primaryKey: config.primaryKey,
      columns,
      rows,
    });
  } catch (error) {
    console.error(`Failed to load table ${req.params.tableId}`, error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to load table.' });
  }
});

app.post('/api/admin/tables/:tableId', (req, res) => {
  try {
    const { tableId } = req.params;
    const { record } = req.body ?? {};
    if (!record || typeof record !== 'object') {
      return res.status(400).json({ error: 'Record payload is required.' });
    }
    const { config, columns, rows } = loadTableData(tableId);
    const key = record[config.primaryKey];
    if (!key) {
      return res
        .status(400)
        .json({ error: `Field "${config.primaryKey}" is required for new records.` });
    }
    if (rows.some((row) => row[config.primaryKey] === key.toString())) {
      return res
        .status(409)
        .json({ error: `A record with ${config.primaryKey}="${key}" already exists.` });
    }
    const sanitized = sanitizeRecord(columns, record);
    rows.push(sanitized);
    writeTableData(tableId, columns, rows);
    res.status(201).json({ message: 'Record added successfully.', row: sanitized });
  } catch (error) {
    console.error(`Failed to add record to table ${req.params.tableId}`, error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to add record.' });
  }
});

app.put('/api/admin/tables/:tableId/:recordId', (req, res) => {
  try {
    const { tableId, recordId } = req.params;
    const { record } = req.body ?? {};
    if (!record || typeof record !== 'object') {
      return res.status(400).json({ error: 'Record payload is required.' });
    }

    const { config, columns, rows } = loadTableData(tableId);
    const primaryKey = config.primaryKey;
    const matchIndex = rows.findIndex((row) => row[primaryKey] === recordId);

    if (matchIndex === -1) {
      return res
        .status(404)
        .json({ error: `Record with ${primaryKey}="${recordId}" not found.` });
    }

    const updatedRecord = {
      ...rows[matchIndex],
      ...sanitizeRecord(columns, record),
    };

    // Ensure primary key remains unchanged
    updatedRecord[primaryKey] = rows[matchIndex][primaryKey];

    rows[matchIndex] = updatedRecord;
    writeTableData(tableId, columns, rows);

    res.json({ message: 'Record updated successfully.', row: updatedRecord });
  } catch (error) {
    console.error(`Failed to update record in table ${req.params.tableId}`, error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to update record.' });
  }
});

app.delete('/api/admin/tables/:tableId/:recordId', (req, res) => {
  try {
    const { tableId, recordId } = req.params;
    const { config, columns, rows } = loadTableData(tableId);
    const primaryKey = config.primaryKey;
    const filtered = rows.filter((row) => row[primaryKey] !== recordId);

    if (filtered.length === rows.length) {
      return res
        .status(404)
        .json({ error: `Record with ${primaryKey}="${recordId}" not found.` });
    }

    writeTableData(tableId, columns, filtered);
    res.json({ message: 'Record deleted successfully.' });
  } catch (error) {
    console.error(`Failed to delete record from table ${req.params.tableId}`, error);
    res.status(error.status || 500).json({ error: error.message || 'Failed to delete record.' });
  }
});

app.listen(PORT, () => {
  console.log(`Events inquiry API running on http://localhost:${PORT}`);
});

