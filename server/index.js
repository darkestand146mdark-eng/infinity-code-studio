import express from "express";
import cors from "cors";
import path from "path";
import { promises as fs } from "fs";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ================= WORKSPACE ================= */

const WORKSPACE_ROOT = path.resolve("./workspace");

await fs.mkdir(WORKSPACE_ROOT, { recursive: true });

/*
 * Secure workspace path.
 * Prevents paths such as ../../etc/passwd
 */
function safePath(input = "") {
  const cleanInput = String(input)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const resolved = path.resolve(WORKSPACE_ROOT, cleanInput);

  if (
    resolved !== WORKSPACE_ROOT &&
    !resolved.startsWith(WORKSPACE_ROOT + path.sep)
  ) {
    throw new Error("Invalid workspace path");
  }

  return resolved;
}

/* ================= BASIC SERVER ================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Infinity Code Studio Server is running!",
    workspace: "ready"
  });
});

/* ================= WORKSPACE LIST ================= */

app.get("/workspace/list", async (req, res) => {
  try {
    const dir = req.query.dir || "";
    const fullPath = safePath(dir);

    const entries = await fs.readdir(fullPath, {
      withFileTypes: true
    });

    const files = entries.map((entry) => ({
      name: entry.name,
      type: entry.isDirectory() ? "folder" : "file",
      path: path
        .relative(WORKSPACE_ROOT, path.join(fullPath, entry.name))
        .replace(/\\/g, "/")
    }));

    res.json({
      success: true,
      directory: dir,
      files
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= READ FILE ================= */

app.get("/workspace/file", async (req, res) => {
  try {
    const filePath = req.query.path;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "path is required"
      });
    }

    const fullPath = safePath(filePath);
    const content = await fs.readFile(fullPath, "utf8");

    res.json({
      success: true,
      path: filePath,
      content
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= WRITE FILE ================= */

app.put("/workspace/file", async (req, res) => {
  try {
    const { filePath, content = "" } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "filePath is required"
      });
    }

    const fullPath = safePath(filePath);

    await fs.mkdir(path.dirname(fullPath), {
      recursive: true
    });

    await fs.writeFile(fullPath, content, "utf8");

    res.json({
      success: true,
      message: "File saved",
      filePath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= RENAME FILE ================= */

app.put("/workspace/file/rename", async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({
        success: false,
        error: "oldPath and newPath are required"
      });
    }

    const oldFullPath = safePath(oldPath);
    const newFullPath = safePath(newPath);

    await fs.mkdir(path.dirname(newFullPath), {
      recursive: true
    });

    await fs.rename(oldFullPath, newFullPath);

    res.json({
      success: true,
      message: "File renamed",
      oldPath,
      newPath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= DUPLICATE FILE ================= */

app.post("/workspace/file/duplicate", async (req, res) => {
  try {
    const { sourcePath, targetPath } = req.body;

    if (!sourcePath || !targetPath) {
      return res.status(400).json({
        success: false,
        error: "sourcePath and targetPath are required"
      });
    }

    const sourceFullPath = safePath(sourcePath);
    const targetFullPath = safePath(targetPath);

    await fs.mkdir(path.dirname(targetFullPath), {
      recursive: true
    });

    await fs.copyFile(sourceFullPath, targetFullPath);

    res.json({
      success: true,
      message: "File duplicated",
      sourcePath,
      targetPath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= CREATE FOLDER ================= */

app.post("/workspace/folder", async (req, res) => {
  try {
    const { folderPath } = req.body;

    if (!folderPath) {
      return res.status(400).json({
        success: false,
        error: "folderPath is required"
      });
    }

    const fullPath = safePath(folderPath);

    await fs.mkdir(fullPath, {
      recursive: true
    });

    res.json({
      success: true,
      message: "Folder created",
      folderPath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= MOVE FILE ================= */

app.put("/workspace/file/move", async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;

    if (!oldPath || !newPath) {
      return res.status(400).json({
        success: false,
        error: "oldPath and newPath are required"
      });
    }

    const oldFullPath = safePath(oldPath);
    const newFullPath = safePath(newPath);

    await fs.mkdir(path.dirname(newFullPath), {
      recursive: true
    });

    await fs.rename(oldFullPath, newFullPath);

    res.json({
      success: true,
      message: "File moved",
      oldPath,
      newPath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= DELETE FILE/FOLDER ================= */

app.delete("/workspace", async (req, res) => {
  try {
    const targetPath = req.query.path;

    if (!targetPath) {
      return res.status(400).json({
        success: false,
        error: "path is required"
      });
    }

    const fullPath = safePath(targetPath);

    await fs.rm(fullPath, {
      recursive: true,
      force: true
    });

    res.json({
      success: true,
      message: "Deleted",
      path: targetPath
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Infinity Code Studio Server running on port ${PORT}`);
  console.log(`Workspace: ${WORKSPACE_ROOT}`);
});
