import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import multer from 'multer';
import crypto from 'node:crypto';
import process from 'node:process';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_ROOT = path.join(PROJECT_ROOT, 'public');
const CSV_PATH = path.join(DATA_DIR, 'event_inquiries.csv');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '2h';
const USERS_PATH = path.join(DATA_DIR, 'users.json');

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

const CSV_COLUMNS = HEADER_CONFIG.map((col) => col.key);

const loadUsers = () => {
  if (!fs.existsSync(USERS_PATH)) {
    throw new Error('User store is missing. Seed server/data/users.json.');
  }
  const fileContents = fs.readFileSync(USERS_PATH, 'utf8');
  const parsed = JSON.parse(fileContents);
  if (!Array.isArray(parsed)) {
    throw new Error('User store is malformed.');
  }
  return parsed;
};

const findUserByCredentials = (username, password) => {
  const normalizedUsername = (username || '').trim().toLowerCase();
  const users = loadUsers();
  return users.find(
    (user) =>
      (user.username || '').toLowerCase() === normalizedUsername &&
      user.password === password,
  );
};

const loadExistingRows = () => {
  if (!fs.existsSync(CSV_PATH)) {
    return [];
  }

  const fileContents = fs.readFileSync(CSV_PATH, 'utf8');
  const parsed = Papa.parse(fileContents, { header: true, skipEmptyLines: true });

  if (parsed.errors.length > 0) {
    const errorMessages = parsed.errors.map((error) => error.message).join('; ');
    throw new Error(`Failed to parse inquiries CSV: ${errorMessages}`);
  }

  return parsed.data.map((row) => {
    const normalized = {};
    CSV_COLUMNS.forEach((column) => {
      normalized[column] = row[column] ?? '';
    });
    return normalized;
  });
};

const writeRowsToCsv = (rows) => {
  const csv = Papa.unparse(rows, {
    columns: CSV_COLUMNS,
    header: true,
    skipEmptyLines: true,
  });

  fs.writeFileSync(CSV_PATH, `${csv}\n`, 'utf8');
};

const appendInquiryToCsv = (inquiry) => {
  ensureDataDirectory();
  const rows = loadExistingRows();
  rows.push(inquiry);
  writeRowsToCsv(rows);
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

const extractBearerToken = (header = '') => {
  if (typeof header !== 'string') return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  return trimmed.slice(7).trim();
};

const authenticateRequest = (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    console.error('Auth verification failed', error);
    const status = error.name === 'TokenExpiredError' ? 401 : 401;
    const message =
      error.name === 'TokenExpiredError' ? 'Session expired.' : 'Invalid token.';
    res.status(status).json({ error: message });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required.' });
  }
  next();
};

const stripQuotes = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^"|"$/g, '');
};

const assistantCache = {};

const loadAuthUsers = () => {
  if (!fs.existsSync(USERS_PATH)) {
    throw new Error('User directory not initialized.');
  }
  const contents = fs.readFileSync(USERS_PATH, 'utf-8');
  try {
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed)) {
      throw new Error('Users file must contain an array.');
    }
    return parsed;
  } catch (error) {
    throw new Error(`Invalid auth users file: ${error.message}`);
  }
};

const normalizeUsername = (value = '') => value.trim().toLowerCase();

const createAuthToken = (username) =>
  crypto.createHash('sha256').update(`${username}:${Date.now()}:${Math.random()}`).digest('hex');

const ensurePathInside = (parentPath, targetPath) => {
  const relative = path.relative(parentPath, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const parseCsvClean = (filePath) => {
  const csvString = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => {
    const clean = {};
    Object.entries(row).forEach(([key, value]) => {
      const cleanKey = stripQuotes(key);
      clean[cleanKey] = stripQuotes(value);
    });
    return clean;
  });
};

const loadAssistantTable = (tableId) => {
  if (!assistantCache[tableId]) {
    const config = ADMIN_TABLES[tableId];
    if (!config) throw new Error(`Assistant table ${tableId} not found`);
    assistantCache[tableId] = parseCsvClean(config.filePath);
  }
  return assistantCache[tableId];
};

const titleCase = (text = '') =>
  text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const buildProgramStatsResponse = (programTerm, role) => {
  const students = loadAssistantTable('students');
  const engagements = loadAssistantTable('alumniEngagement');

  const term = programTerm.toLowerCase();
  const matchedStudents = students.filter((student) =>
    (student.program_name || '').toLowerCase().includes(term),
  );
  const matchedStudentKeys = new Set(matchedStudents.map((student) => stripQuotes(student.student_key)));

  const engaged = new Set();
  engagements.forEach((row) => {
    const studentKey = stripQuotes(row.student_key);
    if (matchedStudentKeys.has(studentKey) && Number(row.engagement_score || 0) > 0) {
      engaged.add(studentKey);
    }
  });

  const total = matchedStudents.length;
  const engagedCount = engaged.size;

  if (total === 0) {
    return {
      message: `I couldn't find alumni records for ${programTerm}. Try another program or check the latest roster upload.`,
    };
  }

  const base = `We track ${total} alumni in ${titleCase(programTerm)} with ${engagedCount} showing active engagement recently.`;

  if (role === 'admin') {
    const sample = matchedStudents
      .slice(0, 5)
      .map((student) => `${student.first_name} ${student.last_name} (${student.graduation_year})`)
      .join(', ');
    return {
      message: `${base}\nSample alumni: ${sample}.`,
    };
  }

  return { message: `${base}\nAsk an administrator for named lists if you need direct outreach.` };
};

const buildRoleLocationEmployerResponse = ({ jobTerm, locationTerm, employerTerm, role }) => {
  const engagements = loadAssistantTable('alumniEngagement');
  const students = loadAssistantTable('students');
  const employers = loadAssistantTable('employers');

  const employersByKey = new Map(
    employers.map((employer) => [stripQuotes(employer.employer_key), employer]),
  );
  const studentsByKey = new Map(
    students.map((student) => [stripQuotes(student.student_key), student]),
  );

  const jobLower = jobTerm.toLowerCase();
  const locationLower = locationTerm.toLowerCase();
  const employerLower = employerTerm.toLowerCase();

  const matches = engagements.filter((engagement) => {
    const employer = employersByKey.get(stripQuotes(engagement.employer_key));
    if (!employer) return false;

    const jobMatch = (engagement.job_role || '').toLowerCase().includes(jobLower);
    const employerMatch = (employer.employer_name || '').toLowerCase().includes(employerLower);
    const locationMatches =
      (employer.hq_state || '').toLowerCase().includes(locationLower) ||
      (employer.hq_city || '').toLowerCase().includes(locationLower);

    return jobMatch && employerMatch && locationMatches;
  });

  if (matches.length === 0) {
    return {
      message: `No alumni matched ${jobTerm} at ${employerTerm} in ${locationTerm}. Try broadening the role or location filters.`,
    };
  }

  const studentEntries = matches
    .map((match) => studentsByKey.get(stripQuotes(match.student_key)))
    .filter(Boolean);

  if (role !== 'admin') {
    return {
      message: `Found ${studentEntries.length} alumni matching ${jobTerm} at ${employerTerm} in ${locationTerm}. Contact an administrator for individual details.`,
    };
  }

  const list = studentEntries
    .slice(0, 5)
    .map((student) => `${student.first_name} ${student.last_name} (${student.graduation_year}, ${student.program_name})`)
    .join('\n• ');

  return {
    message: `Found ${studentEntries.length} alumni in ${titleCase(locationTerm)} at ${employerTerm}.\n• ${list}`,
  };
};

const buildEmployerPatternResponse = (role) => {
  const employers = loadAssistantTable('employers');
  const engagements = loadAssistantTable('alumniEngagement');
  const students = loadAssistantTable('students');

  const amazonEmployers = employers.filter((employer) =>
    (employer.employer_name || '').toLowerCase().includes('amazon'),
  );
  const studentsByKey = new Map(
    students.map((student) => [stripQuotes(student.student_key), student]),
  );

  const targetEmployers = amazonEmployers.length > 0 ? amazonEmployers : employers.filter((employer) => (employer.sector || '').toLowerCase().includes('technology'));

  const targetKeys = new Set(targetEmployers.map((employer) => stripQuotes(employer.employer_key)));

  const relevantEngagements = engagements.filter((engagement) =>
    targetKeys.has(stripQuotes(engagement.employer_key)),
  );

  if (relevantEngagements.length === 0) {
    return {
      message: 'No matching hiring pattern found for Amazon. Train the model with the latest employer engagement data or upload Amazon-specific cohorts.',
    };
  }

  const studentScores = new Map();
  relevantEngagements.forEach((engagement) => {
    const studentKey = stripQuotes(engagement.student_key);
    const currentScore = studentScores.get(studentKey) || 0;
    studentScores.set(studentKey, currentScore + Number(engagement.engagement_score || 0));
  });

  const rankedStudents = Array.from(studentScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, role === 'admin' ? 5 : 3)
    .map(([studentKey, score]) => {
      const student = studentsByKey.get(studentKey);
      if (!student) return null;
      return {
        name: `${student.first_name} ${student.last_name}`,
        program: student.program_name,
        graduation: student.graduation_year,
        confidence: Math.min(0.95, 0.7 + score / 20),
      };
    })
    .filter(Boolean);

  if (rankedStudents.length === 0) {
    return {
      message: 'No students matched the Amazon hiring pattern. Encourage cloud-focused cohorts to boost alignment.',
    };
  }

  const list = rankedStudents
    .map(
      (student) =>
        `${student.name} – ${student.program} (${student.graduation}) • ${(student.confidence * 100).toFixed(0)}% alignment`,
    )
    .join('\n');

  return {
    message: `Based on recent tech-sector hires, these students align with Amazon's pattern:\n${list}\n\nRecommendation: invite them to the Amazon interview prep track and emphasize AWS/data engineering skills.`,
  };
};

const buildFallbackResponse = () => ({
  message:
    "I'm still learning that query. Try asking about alumni counts, employer trends, or predictive outlook data—or email insights@datanexus.ai for a detailed report.",
});

const buildAssistantResponse = (question, role) => {
  const lower = question.toLowerCase();

  if (lower.includes('full stack') && lower.includes('california') && lower.includes('mckinsey')) {
    return buildRoleLocationEmployerResponse({ jobTerm: 'Full Stack', locationTerm: 'California', employerTerm: 'McKinsey', role });
  }

  if (lower.includes('data analytics') && lower.includes('alumni')) {
    return buildProgramStatsResponse('Data Analytics', role);
  }

  if (lower.includes('predict') && lower.includes('amazon')) {
    return buildEmployerPatternResponse(role);
  }

  return buildFallbackResponse();
};

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

app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const users = loadAuthUsers();
    const normalized = normalizeUsername(username);
    const match = users.find(
      (user) =>
        normalizeUsername(user.username) === normalized &&
        typeof user.password === 'string' &&
        user.password === password,
    );

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = createAuthToken(match.username);
    res.json({
      token,
      user: {
        username: match.username,
        role: match.role ?? 'admin',
      },
    });
  } catch (error) {
    console.error('Authentication failed', error);
    res.status(500).json({ error: 'Authentication failed.' });
    const user = findUserByCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const payload = { username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, user: payload });
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ error: 'Failed to authenticate.' });
  }
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

    appendInquiryToCsv(formattedRow);
    res.status(201).json({ message: 'Inquiry stored successfully.' });
  } catch (error) {
    console.error('Failed to store inquiry', error);
    res.status(500).json({ error: error.message || 'Failed to store inquiry.' });
  }
});

app.get('/api/admin/images', authenticateRequest, requireAdmin, (req, res) => {
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

app.post('/api/admin/images', authenticateRequest, requireAdmin, upload.single('image'), (req, res) => {
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

app.delete('/api/admin/images/:category/:filename', authenticateRequest, requireAdmin, (req, res) => {
  try {
    const { category, filename } = req.params;
    const categoryInfo = getImageCategory(category);
    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(categoryInfo.absolutePath, decodedFilename);

    if (!ensurePathInside(categoryInfo.absolutePath, filePath)) {
      return res.status(400).json({ error: 'Invalid filename.' });
    }

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

const ASSISTANT_ROLES = new Set(['admin', 'alumni', 'employer']);

app.post('/api/assistant/query', (req, res) => {
  try {
    const { question, role } = req.body ?? {};

    if (!question || !role) {
      return res.status(400).json({ error: 'Question and role are required.' });
    }

    if (!ASSISTANT_ROLES.has(role)) {
      return res.status(403).json({ error: 'Role not permitted for assistant access.' });
    }

    const response = buildAssistantResponse(question, role);
    res.json(response);
  } catch (error) {
    console.error('Assistant query failed', error);
    res.status(500).json({ error: 'Assistant query failed.' });
  }
});

app.get('/api/admin/tables', authenticateRequest, requireAdmin, (req, res) => {
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

app.get('/api/admin/tables/:tableId', authenticateRequest, requireAdmin, (req, res) => {
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

app.post('/api/admin/tables/:tableId', authenticateRequest, requireAdmin, (req, res) => {
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

app.put('/api/admin/tables/:tableId/:recordId', authenticateRequest, requireAdmin, (req, res) => {
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

app.delete('/api/admin/tables/:tableId/:recordId', authenticateRequest, requireAdmin, (req, res) => {
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

