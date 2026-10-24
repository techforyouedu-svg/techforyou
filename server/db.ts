import fs from 'fs';
import path from 'path';
import bcryptjs from 'bcryptjs';
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import {
  AdminUser,
  Student,
  Course,
  Enrollment,
  GradingConfiguration,
  CertificateTemplate,
  Certificate,
  InstituteSettings,
  AuditLog,
} from './types.js';

// Ensure .env is loaded
dotenv.config();

interface DatabaseSchema {
  admins: AdminUser[];
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  gradingConfigs: GradingConfiguration[];
  templates: CertificateTemplate[];
  certificates: Certificate[];
  settings: InstituteSettings;
  auditLogs: AuditLog[];
}

export interface DatabaseStatus {
  mode: 'mongodb' | 'file';
  connected: boolean;
  databaseName?: string;
  uriMasked?: string;
  error?: string | null;
  counts: {
    admins: number;
    students: number;
    courses: number;
    enrollments: number;
    certificates: number;
    auditLogs: number;
  };
}

const isServerless = Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BASE_DATA_DIR = path.resolve(process.cwd(), 'data');
const ORIGINAL_DB_FILE = path.join(BASE_DATA_DIR, 'db.json');
const DATA_DIR = isServerless ? '/tmp' : BASE_DATA_DIR;
const DB_FILE = isServerless ? path.join('/tmp', 'db.json') : ORIGINAL_DB_FILE;
const ENV_FILE = path.resolve(process.cwd(), '.env');

// Ensure data folder exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (_) {}

// Default Seed Data
async function generateInitialDatabase(): Promise<DatabaseSchema> {
  const passwordHash = bcryptjs.hashSync('admin123', 10);

  const defaultAdmin: AdminUser = {
    id: 'admin-1',
    email: 'admin@techforyou.edu',
    passwordHash,
    name: 'Administrator (Tech For You)',
    role: 'superadmin',
    createdAt: new Date().toISOString(),
  };

  const defaultSettings: InstituteSettings = {
    instituteName: 'Tech For You',
    tagline: 'Centre of Advanced Engineering, Software Development & Certified Computing',
    registrationNumber: 'TFY-REG-2021-0894',
    accreditationDetails: 'Centre of Advanced Software Engineering & Certified Computing',
    address: 'Kot Radha Kishan',
    phone: '03194331346',
    email: '',
    website: 'https://techforyou.edu.pk',
    instructorName: 'M.Moiz Raza',
    instructorTitle: 'Course Instructor',
    instructorSignatureUrl: 'M. Moiz Raza',
    directorName: '',
    directorTitle: '',
    directorSignatureUrl: '',
    registrarName: '',
    registrarTitle: '',
    registrarSignatureUrl: '',
    instituteSealUrl: '/logo.png',
    logoUrl: '/logo.png',
    certificateSerialPrefix: 'TFY-2026',
    certificateTitle: 'CERTIFICATE OF PROFESSIONAL COMPETENCE',
    certificateWording:
      'This is to certify that the candidate named herein has satisfactorily fulfilled all prescribed academic prerequisites, technical laboratory assignments, practical engineering modules, and comprehensive capstone project evaluations with commendable proficiency.',
    verificationInstructions:
      'This certificate is an official cryptographic credential issued by Tech For You. Verify authenticity by scanning the official QR code or visiting https://techforyou.edu.pk/verify with the serial number.',
  };

  const gradingConfig: GradingConfiguration = {
    id: 'gc-default',
    title: 'Standard Institute Weightage Scheme (2026)',
    method: 'weighted',
    passingPercentage: 50,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parameters: [
      { id: 'param-theory', name: 'Theory & Technical Foundations', maxMarks: 100, weightage: 25, isRequired: true, description: 'Written & architectural conceptual assessment' },
      { id: 'param-practical', name: 'Hands-on Practical Labs & Coding', maxMarks: 100, weightage: 30, isRequired: true, description: 'Lab tests, debugging challenges, and real-time coding' },
      { id: 'param-project', name: 'Comprehensive Capstone Project', maxMarks: 100, weightage: 25, isRequired: true, description: 'Production-ready full deployment & GitHub review' },
      { id: 'param-viva', name: 'Technical Defense & Viva Voce', maxMarks: 50, weightage: 10, isRequired: true, description: 'Oral panel questioning & architecture explanation' },
      { id: 'param-assignments', name: 'Continuous Assignments & Quizzes', maxMarks: 50, weightage: 10, isRequired: false, description: 'Weekly milestones and task submissions' },
    ],
    rules: [
      { minPercentage: 90, grade: 'A+', resultLabel: 'Pass with High Distinction', isPassing: true, description: 'Outstanding performance across all theoretical & practical benchmarks' },
      { minPercentage: 80, grade: 'A', resultLabel: 'Pass with Distinction', isPassing: true, description: 'Excellent technical execution and conceptual command' },
      { minPercentage: 70, grade: 'B', resultLabel: 'Pass with Merit', isPassing: true, description: 'Very good understanding and consistent lab achievements' },
      { minPercentage: 60, grade: 'C', resultLabel: 'Pass (Satisfactory)', isPassing: true, description: 'Satisfactory completion meeting standard industry requirements' },
      { minPercentage: 50, grade: 'D', resultLabel: 'Pass', isPassing: true, description: 'Marginal pass meeting minimum prescribed thresholds' },
      { minPercentage: 0, grade: 'F', resultLabel: 'Fail', isPassing: false, description: 'Did not meet the prerequisite passing criteria' },
    ],
  };

  const templates: CertificateTemplate[] = [
    {
      id: 'tmpl-web-development',
      name: 'Professional Web Development (Floating Code Signs)',
      description: 'Specialized Web Development certificate theme featuring ambient floating coding tokens (</>, {}, async, git, React), cyber emerald borders, and Course Instructor accreditation.',
      themeStyle: 'web_development',
      primaryColor: '#040907',
      accentColor: '#10b981',
      secondaryColor: '#00ff87',
      borderStyle: 'cyber_circuit',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: true,
    },
    {
      id: 'tmpl-cyber-emerald',
      name: 'Cyber Sentinel Obsidian & Emerald (Official)',
      description: 'Futuristic cybersecurity styling with neon emerald accents, obsidian dark borders, and circuit watermark.',
      themeStyle: 'cyber_emerald',
      primaryColor: '#0a0f0d',
      accentColor: '#10b981',
      secondaryColor: '#00ff66',
      borderStyle: 'cyber_circuit',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: false,
    },
    {
      id: 'tmpl-imperial-gold',
      name: 'Imperial Royal Obsidian & Gold',
      description: 'Prestigious deep obsidian border with gold double-inlay accents, ceremonial seal, and crisp typography.',
      themeStyle: 'imperial_gold',
      primaryColor: '#0f1715',
      accentColor: '#10b981',
      secondaryColor: '#1e3a8a',
      borderStyle: 'ornate',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: false,
      isDefault: false,
    },
    {
      id: 'tmpl-modern-minimal',
      name: 'Modern Cyber Minimalist',
      description: 'Clean modern corporate styling with electric emerald highlights, high legibility, and architectural precision.',
      themeStyle: 'modern_minimal',
      primaryColor: '#060b09',
      accentColor: '#00ff66',
      secondaryColor: '#10b981',
      borderStyle: 'minimal',
      showFatherName: true,
      showGradeFront: true,
      showSeal: true,
      showQR: true,
      showSignatures: true,
      showFloatingCodeSigns: true,
      isDefault: false,
    },
  ];

  const courses: Course[] = [
    {
      id: 'course-fs-101',
      title: 'Full-Stack Web Development & Cloud Architecture (MERN + TypeScript)',
      code: 'FS-101',
      category: 'Software Engineering',
      duration: '6 Months (480 Academic Hours)',
      description: 'Comprehensive industry program covering modern React 19, TypeScript, Node.js, Express, MongoDB database architecture, Docker containers, and cloud deployment.',
      status: 'active',
      defaultTemplateId: 'tmpl-imperial-gold',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-fs-1', title: 'Design modular front-end architectures using React 19, TypeScript, and modern component systems', order: 1 },
        { id: 'oc-fs-2', title: 'Architect robust RESTful APIs with Node.js, Express, middleware security, and JWT authorization', order: 2 },
        { id: 'oc-fs-3', title: 'Model complex relational and document data in MongoDB with indexing and aggregation pipelines', order: 3 },
        { id: 'oc-fs-4', title: 'Implement full-stack state management, optimistic updates, and real-time WebSocket communication', order: 4 },
        { id: 'oc-fs-5', title: 'Containerize multi-tier web applications with Docker and deploy to production cloud platforms with automated CI/CD', order: 5 },
      ],
    },
    {
      id: 'course-ds-201',
      title: 'Data Science, Machine Learning & Applied Artificial Intelligence',
      code: 'DS-201',
      category: 'Data Science & AI',
      duration: '6 Months (480 Academic Hours)',
      description: 'In-depth specialization covering Python data engineering, statistical modeling, machine learning algorithms, deep neural networks, and generative AI deployment.',
      status: 'active',
      defaultTemplateId: 'tmpl-sovereign-navy',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-ds-1', title: 'Perform exploratory data analysis and feature engineering on high-dimensional unstructured datasets', order: 1 },
        { id: 'oc-ds-2', title: 'Train, evaluate, and tune supervised and unsupervised machine learning models using Scikit-Learn', order: 2 },
        { id: 'oc-ds-3', title: 'Build computer vision and NLP models using PyTorch, convolutional layers, and Transformer architectures', order: 3 },
        { id: 'oc-ds-4', title: 'Integrate and deploy Large Language Model (LLM) agents, vector embeddings, and RAG pipelines', order: 4 },
        { id: 'oc-ds-5', title: 'Deploy machine learning inference endpoints with FastAPI, Docker, and model monitoring telemetry', order: 5 },
      ],
    },
    {
      id: 'course-do-301',
      title: 'DevOps Engineering, Kubernetes & Multi-Cloud Infrastructure',
      code: 'DO-301',
      category: 'Cloud & Infrastructure',
      duration: '4 Months (320 Academic Hours)',
      description: 'Hands-on enterprise program covering Linux administration, Infrastructure as Code with Terraform, Kubernetes clustering, CI/CD pipelines, and cloud observability.',
      status: 'active',
      defaultTemplateId: 'tmpl-modern-minimal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-do-1', title: 'Provision scalable multi-region cloud infrastructure using Terraform and Infrastructure as Code (IaC)', order: 1 },
        { id: 'oc-do-2', title: 'Deploy, scale, and manage production Kubernetes microservices clusters with Helm charts and Ingress controllers', order: 2 },
        { id: 'oc-do-3', title: 'Build automated CI/CD deployment pipelines with automated linting, test suites, and container registry pushing', order: 3 },
        { id: 'oc-do-4', title: 'Implement cluster-wide monitoring, distributed tracing, and log aggregation with Prometheus and Grafana', order: 4 },
        { id: 'oc-do-5', title: 'Enforce enterprise cloud security standards, least-privilege IAM policies, and secret management vaults', order: 5 },
      ],
    },
    {
      id: 'course-ux-401',
      title: 'Advanced UI/UX Product Design & Design Systems Engineering',
      code: 'UX-401',
      category: 'Design & Product',
      duration: '3 Months (240 Academic Hours)',
      description: 'Mastery in user research, design psychology, Figma component token systems, accessibility compliance (WCAG AA), and design-to-code workflow.',
      status: 'active',
      defaultTemplateId: 'tmpl-imperial-gold',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      learningOutcomes: [
        { id: 'oc-ux-1', title: 'Conduct qualitative user research, persona creation, customer journey mapping, and empathy analysis', order: 1 },
        { id: 'oc-ux-2', title: 'Build production-ready design systems in Figma with auto-layout, design tokens, and variant properties', order: 2 },
        { id: 'oc-ux-3', title: 'Design accessible, high-contrast user interfaces strictly conforming to WCAG AA international criteria', order: 3 },
        { id: 'oc-ux-4', title: 'Construct interactive responsive prototypes for web, tablet, and mobile with realistic micro-animations', order: 4 },
        { id: 'oc-ux-5', title: 'Run usability benchmarking tests, synthesize telemetry feedback, and document developer handoff specifications', order: 5 },
      ],
    },
  ];

  const students: Student[] = [];
  const enrollments: Enrollment[] = [];
  const certificates: Certificate[] = [];
  const auditLogs: AuditLog[] = [];

  return {
    admins: [defaultAdmin],
    students,
    courses,
    enrollments,
    gradingConfigs: [gradingConfig],
    templates,
    certificates,
    settings: defaultSettings,
    auditLogs,
  };
}

class DatabaseService {
  private data!: DatabaseSchema;
  private initialized = false;

  // MongoDB connection state
  private mongoClient: MongoClient | null = null;
  private mongoDb: Db | null = null;
  private isMongoConnected = false;
  private mongoUriMasked = '';
  private mongoDatabaseName = '';
  private mongoError: string | null = null;
  private isSyncing = false;
  private syncPending = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // In serverless (e.g. Vercel), copy original seed database to /tmp if not yet present
    if (isServerless && !fs.existsSync(DB_FILE) && fs.existsSync(ORIGINAL_DB_FILE)) {
      try {
        fs.copyFileSync(ORIGINAL_DB_FILE, DB_FILE);
      } catch (e) {
        console.warn('Could not copy initial db.json to /tmp:', e);
      }
    }

    // 1. First, load existing local file data as baseline
    const targetFileToRead = fs.existsSync(DB_FILE)
      ? DB_FILE
      : fs.existsSync(ORIGINAL_DB_FILE)
      ? ORIGINAL_DB_FILE
      : null;

    if (targetFileToRead) {
      try {
        const raw = fs.readFileSync(targetFileToRead, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading DB_FILE, rebuilding from seed...', err);
        this.data = await generateInitialDatabase();
      }
    } else {
      this.data = await generateInitialDatabase();
      this.saveToFile();
    }

    // 2. Check for MongoDB connection string in environment variables (.env)
    const envMongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;
    if (envMongoUri && envMongoUri.trim()) {
      console.log('🍃 Found MongoDB URI in environment. Attempting connection...');
      await this.connectMongo(envMongoUri.trim(), false);
    } else {
      console.log('ℹ️ Running in persistent file storage mode (data/db.json). MongoDB URI can be configured via .env or Admin settings.');
    }

    this.initialized = true;
  }

  // Connect to MongoDB
  async connectMongo(
    uri: string,
    saveToEnv = false
  ): Promise<{ success: boolean; message: string; dbName?: string; status?: DatabaseStatus }> {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      return { success: false, message: 'MongoDB connection URI is required.' };
    }

    try {
      // Disconnect existing client if connected
      if (this.mongoClient) {
        try {
          await this.mongoClient.close();
        } catch (_) {}
        this.mongoClient = null;
        this.mongoDb = null;
        this.isMongoConnected = false;
      }

      console.log('🍃 Connecting to MongoDB...');
      const client = new MongoClient(cleanUri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 10000,
      });

      await client.connect();

      // Ping to verify authentication and cluster status
      await client.db().command({ ping: 1 });

      const parsedDbName = client.options.dbName || 'tech_for_you';
      const database = client.db(parsedDbName);

      this.mongoClient = client;
      this.mongoDb = database;
      this.isMongoConnected = true;
      this.mongoDatabaseName = parsedDbName;
      this.mongoError = null;

      // Mask password in URI for safe display
      this.mongoUriMasked = cleanUri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:••••••••@');

      console.log(`🍃 Connected successfully to MongoDB database: "${parsedDbName}"`);

      // Optionally update or write .env file
      if (saveToEnv) {
        this.writeEnvMongoUri(cleanUri);
      }

      // Sync data: either populate from MongoDB if it has existing records,
      // or migrate existing local records to MongoDB
      await this.syncFromMongoOrSeed();

      return {
        success: true,
        message: `Successfully connected to MongoDB database "${parsedDbName}"`,
        dbName: parsedDbName,
        status: this.getDatabaseStatus(),
      };
    } catch (err: any) {
      console.error('⚠️ MongoDB connection failed:', err?.message || err);
      this.mongoError = err?.message || 'Failed to connect to MongoDB cluster';
      this.isMongoConnected = false;
      return {
        success: false,
        message: err?.message || 'Failed to connect to MongoDB. Please verify host, username, password, and network access.',
        status: this.getDatabaseStatus(),
      };
    }
  }

  // Disconnect from MongoDB and revert to file storage
  async disconnectMongo(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.mongoClient) {
        await this.mongoClient.close();
      }
      this.mongoClient = null;
      this.mongoDb = null;
      this.isMongoConnected = false;
      this.mongoError = null;
      this.mongoUriMasked = '';
      this.mongoDatabaseName = '';
      console.log('🔌 Disconnected from MongoDB. Active database mode: Local File Storage (data/db.json).');
      return { success: true, message: 'Disconnected from MongoDB. Reverted to local file storage.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Error disconnecting from MongoDB' };
    }
  }

  // Write MONGODB_URI into .env file
  private writeEnvMongoUri(uri: string): void {
    try {
      let content = '';
      if (fs.existsSync(ENV_FILE)) {
        content = fs.readFileSync(ENV_FILE, 'utf-8');
      }

      if (/^MONGODB_URI=.*/m.test(content)) {
        content = content.replace(/^MONGODB_URI=.*/m, `MONGODB_URI="${uri}"`);
      } else {
        content = content ? `${content.trim()}\n\nMONGODB_URI="${uri}"\n` : `MONGODB_URI="${uri}"\n`;
      }

      fs.writeFileSync(ENV_FILE, content, 'utf-8');
      process.env.MONGODB_URI = uri;
      console.log('✅ Updated MONGODB_URI in .env file.');
    } catch (err) {
      console.warn('Could not write to .env file:', err);
    }
  }

  // Initial sync when MongoDB connects
  private async syncFromMongoOrSeed(): Promise<void> {
    if (!this.isMongoConnected || !this.mongoDb) return;

    try {
      const certificatesCol = this.mongoDb.collection('certificates');
      const coursesCol = this.mongoDb.collection('courses');
      const mongoCertCount = await certificatesCol.countDocuments();
      const mongoCourseCount = await coursesCol.countDocuments();

      if (mongoCertCount > 0 || mongoCourseCount > 0) {
        // MongoDB already contains data: Pull from MongoDB into memory
        console.log(`📥 Loading existing records from MongoDB (${mongoCertCount} certificates, ${mongoCourseCount} courses)...`);

        const admins = (await this.mongoDb.collection('admins').find({}).toArray()) as any[];
        const students = (await this.mongoDb.collection('students').find({}).toArray()) as any[];
        const courses = (await this.mongoDb.collection('courses').find({}).toArray()) as any[];
        const enrollments = (await this.mongoDb.collection('enrollments').find({}).toArray()) as any[];
        const gradingConfigs = (await this.mongoDb.collection('gradingConfigs').find({}).toArray()) as any[];
        const templates = (await this.mongoDb.collection('templates').find({}).toArray()) as any[];
        const certificates = (await certificatesCol.find({}).toArray()) as any[];
        const auditLogs = (await this.mongoDb.collection('auditLogs').find({}).sort({ timestamp: -1 }).limit(500).toArray()) as any[];
        const settingsDoc = (await this.mongoDb.collection('settings').findOne({ _id: 'institute_settings' as any })) as any;

        // Clean MongoDB _id to match schema
        const cleanDocs = <T extends { id?: string }>(arr: any[]): T[] =>
          arr.map((doc) => {
            const { _id, ...rest } = doc;
            return { id: doc.id || _id?.toString(), ...rest } as T;
          });

        if (admins.length > 0) this.data.admins = cleanDocs<AdminUser>(admins);
        if (students.length > 0) this.data.students = cleanDocs<Student>(students);
        if (courses.length > 0) this.data.courses = cleanDocs<Course>(courses);
        if (enrollments.length > 0) this.data.enrollments = cleanDocs<Enrollment>(enrollments);
        if (gradingConfigs.length > 0) this.data.gradingConfigs = cleanDocs<GradingConfiguration>(gradingConfigs);
        if (templates.length > 0) this.data.templates = cleanDocs<CertificateTemplate>(templates);
        if (certificates.length > 0) this.data.certificates = cleanDocs<Certificate>(certificates);
        if (auditLogs.length > 0) this.data.auditLogs = cleanDocs<AuditLog>(auditLogs);
        if (settingsDoc) {
          const { _id, ...cleanedSettings } = settingsDoc;
          this.data.settings = cleanedSettings as InstituteSettings;
        }

        // Save fresh backup snapshot to local db.json
        this.saveToFile();
        console.log('✅ Synchronized MongoDB collections to local in-memory store.');
      } else {
        // MongoDB is empty: Seed existing local data into MongoDB
        console.log('📤 MongoDB collections are empty. Migrating local database records to MongoDB...');
        await this.syncToMongoAsync();
        console.log('✅ Migrated initial database records to MongoDB successfully.');
      }
    } catch (err) {
      console.error('Error during MongoDB synchronization:', err);
    }
  }

  // Push current memory state to MongoDB collections
  async syncToMongoAsync(): Promise<void> {
    if (!this.isMongoConnected || !this.mongoDb) return;

    if (this.isSyncing) {
      this.syncPending = true;
      return;
    }

    this.isSyncing = true;
    try {
      const collections = [
        { name: 'admins', data: this.data.admins },
        { name: 'students', data: this.data.students },
        { name: 'courses', data: this.data.courses },
        { name: 'enrollments', data: this.data.enrollments },
        { name: 'gradingConfigs', data: this.data.gradingConfigs },
        { name: 'templates', data: this.data.templates },
        { name: 'certificates', data: this.data.certificates },
        { name: 'auditLogs', data: this.data.auditLogs },
      ] as const;

      for (const colInfo of collections) {
        const col = this.mongoDb.collection(colInfo.name);
        const docs = colInfo.data;

        if (docs.length === 0) {
          await col.deleteMany({});
        } else {
          const bulkOps = docs.map((doc: any) => ({
            replaceOne: {
              filter: { id: doc.id },
              replacement: { ...doc, _id: doc.id },
              upsert: true,
            },
          }));

          // Remove records that were deleted in the application
          const currentIds = docs.map((d: any) => d.id);
          await col.deleteMany({ id: { $nin: currentIds } });

          if (bulkOps.length > 0) {
            await col.bulkWrite(bulkOps as any, { ordered: false });
          }
        }
      }

      // Upsert institute settings
      const settingsCol = this.mongoDb.collection('settings');
      await settingsCol.replaceOne(
        { _id: 'institute_settings' as any },
        { _id: 'institute_settings' as any, ...this.data.settings },
        { upsert: true }
      );
    } catch (err) {
      console.error('Error persisting data to MongoDB:', err);
    } finally {
      this.isSyncing = false;
      if (this.syncPending) {
        this.syncPending = false;
        setTimeout(() => this.syncToMongoAsync(), 100);
      }
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save db.json:', err);
    }
  }

  // Accessors
  get admins(): AdminUser[] { return this.data.admins; }
  get students(): Student[] { return this.data.students; }
  get courses(): Course[] { return this.data.courses; }
  get enrollments(): Enrollment[] { return this.data.enrollments; }
  get gradingConfigs(): GradingConfiguration[] { return this.data.gradingConfigs; }
  get templates(): CertificateTemplate[] { return this.data.templates; }
  get certificates(): Certificate[] { return this.data.certificates; }
  get settings(): InstituteSettings { return this.data.settings; }
  get auditLogs(): AuditLog[] { return this.data.auditLogs; }

  get isMongo(): boolean { return this.isMongoConnected; }
  get mongoDbName(): string { return this.mongoDatabaseName; }

  // Mutations
  persist(): void {
    // 1. Immediately save to local file
    this.saveToFile();

    // 2. If MongoDB is active, asynchronously sync to cluster
    if (this.isMongoConnected && this.mongoDb) {
      this.syncToMongoAsync().catch((err) => console.error('MongoDB async persist error:', err));
    }
  }

  getDatabaseStatus(): DatabaseStatus {
    return {
      mode: this.isMongoConnected ? 'mongodb' : 'file',
      connected: this.isMongoConnected,
      databaseName: this.mongoDatabaseName || undefined,
      uriMasked: this.mongoUriMasked || undefined,
      error: this.mongoError,
      counts: {
        admins: this.data?.admins?.length || 0,
        students: this.data?.students?.length || 0,
        courses: this.data?.courses?.length || 0,
        enrollments: this.data?.enrollments?.length || 0,
        certificates: this.data?.certificates?.length || 0,
        auditLogs: this.data?.auditLogs?.length || 0,
      },
    };
  }

  addAuditLog(actor: string, action: string, entityType: AuditLog['entityType'], entityId: string | undefined, details: string, ipAddress?: string): void {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
    };
    this.data.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
  }
}

export const db = new DatabaseService();
