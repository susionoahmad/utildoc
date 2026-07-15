import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import {
  initDb,
  getUsers,
  getUserByEmail,
  getUserById,
  addUser,
  updateUser,
  deleteUser,
  getTransactions,
  addTransaction,
  getSettings,
  saveSettings,
  getMetrics,
  hashPassword,
  addActivityLog,
  getActivityLogs,
  incrementGuestCounter,
  getToolUsageRanking
} from "./db";

dotenv.config();

// In-memory session store mapping SessionToken -> User Session Info
const SESSIONS = new Map<string, { id: string; email: string; name: string; plan: string; role: string }>();

// Helper to resolve user from auth headers
function getSessionUser(req: express.Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return SESSIONS.get(token) || null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for high-res images and multi-page documents
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize PostgreSQL tables and default mock records
  try {
    await initDb();
  } catch (dbErr) {
    console.error("Critical: Could not connect to PostgreSQL. Verify DATABASE_URL settings.", dbErr);
  }

  // Initialize Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // --- API Endpoints ---

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required fields: email, password, and name" });
      }

      const existingUser = await getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email address." });
      }

      const passwordHash = hashPassword(password);
      const user = await addUser({
        email,
        passwordHash,
        name,
        plan: 'starter',
        status: 'active',
        role: 'user'
      });

      const token = crypto.randomBytes(24).toString("hex");
      SESSIONS.set(token, { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role });

      // Log activity
      await addActivityLog(user.email, "REGISTER", `User registered with name: ${name}`);

      res.json({
        token,
        session: { isLoggedIn: true, email: user.email, plan: user.plan, name: user.name, role: user.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register user." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = await getUserByEmail(email);
      if (!user || hashPassword(password) !== user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: "Your account has been suspended by the administrator." });
      }

      const token = crypto.randomBytes(24).toString("hex");
      SESSIONS.set(token, { id: user.id, email: user.email, name: user.name, plan: user.plan, role: user.role });

      // Log activity
      await addActivityLog(user.email, "LOGIN", "User logged in successfully");

      res.json({
        token,
        session: { isLoggedIn: true, email: user.email, plan: user.plan, name: user.name, role: user.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log in." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const session = SESSIONS.get(token);
      if (session) {
        // Log activity
        await addActivityLog(session.email, "LOGOUT", "User logged out");
        SESSIONS.delete(token);
      }
    }
    res.json({ success: true });
  });

  app.get("/api/auth/session", async (req, res) => {
    const session = getSessionUser(req);
    if (!session) {
      return res.json({ isLoggedIn: false });
    }

    try {
      const user = await getUserById(session.id);
      if (!user) {
        return res.json({ isLoggedIn: false });
      }

      if (user.status === 'suspended') {
        // Purge session
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          SESSIONS.delete(token);
        }
        return res.json({ isLoggedIn: false, error: "Suspended" });
      }

      // Update session info in memory in case it changed in DB
      SESSIONS.set(req.headers.authorization!.split(" ")[1], {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        role: user.role
      });

      res.json({
        isLoggedIn: true,
        email: user.email,
        plan: user.plan,
        name: user.name,
        role: user.role
      });
    } catch {
      res.json({ isLoggedIn: false });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    const session = getSessionUser(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Both current password and new password are required." });
      }

      // Fetch user from DB to verify old password
      const user = await getUserByEmail(session.email);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const hashedCurrent = hashPassword(currentPassword);
      if (hashedCurrent !== user.passwordHash) {
        return res.status(400).json({ error: "Password saat ini tidak cocok." });
      }

      const hashedNew = hashPassword(newPassword);
      await updateUser(user.id, { passwordHash: hashedNew });

      // Log activity
      await addActivityLog(user.email, "AUTH_SETTINGS", "User changed their password successfully");

      res.json({ success: true, message: "Password changed successfully." });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to change password." });
    }
  });

  // 2. Billing / Checkout Route
  app.post("/api/billing/checkout", async (req, res) => {
    try {
      const { email, plan, amount, gateway } = req.body;
      if (!email || !plan || amount === undefined) {
        return res.status(400).json({ error: "Missing required billing details." });
      }

      // Record transaction
      const transaction = await addTransaction({
        userEmail: email,
        plan,
        amount: parseFloat(amount),
        gateway: gateway || 'Stripe',
        status: 'completed'
      });

      // Update memory session if that user is currently active
      for (const [token, sessionData] of SESSIONS.entries()) {
        if (sessionData.email.toLowerCase() === email.toLowerCase()) {
          sessionData.plan = plan;
          SESSIONS.set(token, sessionData);
        }
      }

      res.json({ success: true, transaction });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process transaction." });
    }
  });

  // 2.5 Public settings endpoint
  app.get("/api/settings", async (req, res) => {
    try {
      const settingsObj = await getSettings();
      res.json(settingsObj);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch settings." });
    }
  });

  // 2.7 Activity logger endpoint
  app.post("/api/activity/log", async (req, res) => {
    try {
      const { toolType } = req.body;
      if (!toolType) {
        return res.status(400).json({ error: "toolType is required" });
      }
      
      const session = getSessionUser(req);
      if (session) {
        // Logged-in human user: log detail
        await addActivityLog(session.email, toolType, `Executed ${toolType.replace('_', ' ')} locally`);
      } else {
        // Guest user: increment counter only (no db bloat)
        await incrementGuestCounter(toolType);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log activity" });
    }
  });

  // 3. Admin Dashboard Routes
  app.get("/api/admin/data", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access to admin data. Admins only." });
    }
    try {
      const usersList = await getUsers();
      const transactionsList = await getTransactions();
      const settingsObj = await getSettings();
      const metricsObj = await getMetrics();
      const logsList = await getActivityLogs();
      const rankings = await getToolUsageRanking();

      res.json({
        users: usersList,
        transactions: transactionsList,
        settings: settingsObj,
        metrics: metricsObj,
        activityLogs: logsList,
        toolRankings: rankings
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch admin data." });
    }
  });

  app.post("/api/admin/users/add", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access. Admins only." });
    }
    try {
      const { email, name, plan } = req.body;
      if (!email || !name) {
        return res.status(400).json({ error: "Email and name are required." });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "User already exists." });
      }

      const passwordHash = hashPassword("password");
      const user = await addUser({
        email,
        passwordHash,
        name,
        plan: plan || 'starter',
        status: 'active',
        role: 'user'
      });

      // Log admin action
      await addActivityLog(session.email, "ADMIN_ACTION", `Admin created user: ${email}`);

      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add user." });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access. Admins only." });
    }
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await getUserById(id);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      await updateUser(id, updates);

      // Sync active session plan or status in memory
      for (const [token, sessionData] of SESSIONS.entries()) {
        if (sessionData.id === id) {
          if (updates.plan) sessionData.plan = updates.plan;
          if (updates.name) sessionData.name = updates.name;
          if (updates.role) sessionData.role = updates.role;
          SESSIONS.set(token, sessionData);
        }
      }

      // Log admin action
      await addActivityLog(session.email, "ADMIN_ACTION", `Admin updated user details for ID: ${id}`);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update user." });
    }
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access. Admins only." });
    }
    try {
      const { id } = req.params;
      
      const user = await getUserById(id);
      if (user) {
        // Kick session out of memory
        for (const [token, sessionData] of SESSIONS.entries()) {
          if (sessionData.id === id) {
            SESSIONS.delete(token);
          }
        }
      }

      await deleteUser(id);

      // Log admin action
      await addActivityLog(session.email, "ADMIN_ACTION", `Admin permanently deleted user ID: ${id}`);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete user." });
    }
  });

  app.post("/api/admin/transactions/add", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access. Admins only." });
    }
    try {
      const txData = req.body;
      if (!txData.userEmail || !txData.plan || txData.amount === undefined || !txData.gateway || !txData.status) {
        return res.status(400).json({ error: "Missing transaction attributes." });
      }

      const tx = await addTransaction({
        userEmail: txData.userEmail,
        plan: txData.plan,
        amount: parseFloat(txData.amount),
        gateway: txData.gateway,
        status: txData.status
      });

      // Log admin action
      await addActivityLog(session.email, "ADMIN_ACTION", `Admin logged custom transaction for: ${txData.userEmail}`);

      res.json({ success: true, transaction: tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to log transaction." });
    }
  });

  app.put("/api/admin/settings", async (req, res) => {
    const session = getSessionUser(req);
    if (!session || session.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized access. Admins only." });
    }
    try {
      const settingsData = req.body;
      await saveSettings(settingsData);

      // Log admin action
      await addActivityLog(session.email, "ADMIN_ACTION", "Admin updated global system settings");

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save settings." });
    }
  });

  // Secure OCR pipeline endpoint
  app.post("/api/ocr", async (req, res) => {
    try {
      const { fileData, mimeType, prompt } = req.body;

      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured on the server. Please add it to your Settings > Secrets panel." 
        });
      }

      // Security verify
      const session = getSessionUser(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized. Please log in first." });
      }

      const user = await getUserById(session.id);
      if (!user) {
        return res.status(401).json({ error: "User profile not found." });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: "Your account is suspended by the administrator." });
      }

      if (!fileData) {
        return res.status(400).json({ error: "Missing document file buffer payload" });
      }

      if (!mimeType) {
        return res.status(400).json({ error: "Missing MIME media type" });
      }

      const textPrompt = prompt || 
        "Extract all of the visible text in this document precisely. Preserve the layout structure, lists, tables, and headings where possible. Output ONLY the extracted content. Do not include any conversational introductions, greetings, markdown fences, or outer summary commentary. Preserve original spacing and newlines.";

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileData,
            }
          },
          {
            text: textPrompt
          }
        ]
      });

      const text = response.text || "";

      // Log successful document processing
      await updateUser(user.id, { docsProcessed: user.docsProcessed + 1 });
      await addActivityLog(user.email, "OCR_SCAN", `OCR text extracted from document (${mimeType})`);

      res.json({ text });

    } catch (error: any) {
      console.error("OCR operation failure:", error);
      res.status(500).json({ 
        error: error.message || "An unexpected error occurred during the OCR pipeline." 
      });
    }
  });

  // Secure AI Fix pipeline endpoint
  app.post("/api/aifix", async (req, res) => {
    try {
      const { text, fileData, mimeType, task, customPrompt } = req.body;

      if (!apiKey) {
        return res.status(500).json({ 
          error: "GEMINI_API_KEY is not configured on the server. Please add it to your Settings > Secrets panel." 
        });
      }

      // Security verify
      const session = getSessionUser(req);
      if (!session) {
        return res.status(401).json({ error: "Unauthorized. Please log in first." });
      }

      const user = await getUserById(session.id);
      if (!user) {
        return res.status(401).json({ error: "User profile not found." });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ error: "Your account is suspended by the administrator." });
      }

      let systemInstruction = "";
      switch (task) {
        case "grammar":
          systemInstruction = "You are an expert copyeditor. Proofread and correct all grammatical, punctuation, and spelling errors in the following content. Preserve the original meaning, voice, structure, and formatting exactly, only correcting clear errors. Do not add any conversational intros or wrapper text; output ONLY the corrected content.";
          break;
        case "tone-professional":
          systemInstruction = "You are an executive editor. Rewrite the following content to elevate its tone, making it highly professional, clear, and elegant. Maintain all key information while improving flow, vocabulary, and conciseness. Do not add conversational intros or wrapper text; output ONLY the edited content.";
          break;
        case "reformat-markdown":
          systemInstruction = "You are a master typographer. Take the following input and reformat it into beautiful, clean Markdown with clear headers, lists, blockquotes, and tables where applicable to make it highly readable. Do not add conversational intros or wrapper text; output ONLY the reformatted markdown content.";
          break;
        case "summarize":
          systemInstruction = "You are an elite briefing officer. Create an executive summary of the following document. Structure it with a concise summary sentence followed by clean, high-level bullet points highlighting the core information. Do not add conversational intros or wrapper text; output ONLY the summary.";
          break;
        default:
          systemInstruction = "You are an advanced document assistant. Help the user edit, fix, translate, or format the document according to their custom instructions.";
      }

      if (customPrompt) {
        systemInstruction += `\n\nAdditional user instruction: ${customPrompt}`;
      }

      systemInstruction += "\n\nStrict rule: Output ONLY the processed text. Do not include introductory notes, greeting wrappers, markdown fences like ``` or concluding commentary.";

      const contents: any[] = [];
      if (fileData && mimeType) {
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: fileData
          }
        });
      }

      if (text) {
        contents.push({
          text: `Here is the input text to process:\n\n${text}`
        });
      }

      contents.push({
        text: systemInstruction
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents
      });

      const processedText = response.text || "";

      // Log successful document processing
      await updateUser(user.id, { docsProcessed: user.docsProcessed + 1 });
      await addActivityLog(user.email, "AI_FIX", `AI fixed text using task: ${task}`);

      res.json({ text: processedText });

    } catch (error: any) {
      console.error("AI Fix operation failure:", error);
      res.status(500).json({ 
        error: error.message || "An unexpected error occurred during the AI Fix pipeline." 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
