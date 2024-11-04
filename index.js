const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;
const ROOT_DIR = path.join(__dirname, 'files');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Create the root folder if it does not exist
if (!fs.existsSync(ROOT_DIR)) {
  fs.mkdirSync(ROOT_DIR);
}

// Utility function to check if a path is inside the ROOT_DIR for security
function isSafePath(base, target) {
  const relativePath = path.relative(base, target);
  return (
    relativePath &&
    !relativePath.startsWith('..') &&
    !path.isAbsolute(relativePath)
  );
}

// Create a file or folder
app.post('/create', (req, res) => {
  const { type, name, parent } = req.body;
  const targetPath = path.join(ROOT_DIR, parent ? parent : '', name);

  if (!isSafePath(ROOT_DIR, targetPath)) {
    return res.status(400).json({ message: 'Invalid path' });
  }

  try {
    if (type === 'folder') {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath);
        return res.status(201).json({ message: 'Folder has been created' });
      } else {
        return res.status(400).json({ message: 'Folder already exists' });
      }
    } else if (type === 'file') {
      if (!fs.existsSync(targetPath)) {
        fs.writeFileSync(targetPath, '');
        return res.status(201).json({ message: 'File has been created' });
      } else {
        return res.status(400).json({ message: 'File already exists' });
      }
    } else {
      return res.status(400).json({ message: 'Unknown type' });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

// Edit file content
app.put('/edit-content', (req, res) => {
  const { name, content, parent } = req.body;
  const filePath = path.join(ROOT_DIR, parent ? parent : '', name);

  if (!isSafePath(ROOT_DIR, filePath)) {
    return res.status(400).json({ message: 'Invalid path' });
  }

  try {
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      fs.writeFileSync(filePath, content);
      return res.status(200).json({ message: 'File has been updated' });
    } else {
      return res.status(404).json({ message: 'File not found' });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

// Rename a file or folder
app.put('/rename', (req, res) => {
  const { oldName, newName, parent } = req.body;
  const oldPath = path.join(ROOT_DIR, parent ? parent : '', oldName);
  const newPath = path.join(ROOT_DIR, parent ? parent : '', newName);

  if (!isSafePath(ROOT_DIR, oldPath) || !isSafePath(ROOT_DIR, newPath)) {
    return res.status(400).json({ message: 'Invalid path' });
  }

  try {
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      return res.status(200).json({ message: 'Renaming successful' });
    } else {
      return res.status(404).json({ message: 'File or directory not found' });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});

// List files and folders with nested structure
app.get('/list', (req, res) => {
  const { folder } = req.query;
  const dirPath = path.join(ROOT_DIR, folder ? folder : '');

  console.log(`Request to get a list of files from: ${dirPath}`);

  // if (!isSafePath(ROOT_DIR, dirPath)) {
  //   console.error('Invalid path detected');
  //   return res.status(400).json({ message: 'Invalid path' });
  // }

  try {
    if (fs.existsSync(dirPath) && fs.lstatSync(dirPath).isDirectory()) {
      const items = fs.readdirSync(dirPath).map((item) => {
        const itemPath = path.join(dirPath, item);
        console.log(`Reading a subelement: ${itemPath}`);
        return {
          name: item,
          type: fs.lstatSync(itemPath).isDirectory() ? 'folder' : 'file',
          ...(fs.lstatSync(itemPath).isDirectory() && {
            children: fs.readdirSync(itemPath).map((subItem) => {
              const subItemPath = path.join(itemPath, subItem);
              console.log(`Reading a subelement: ${subItemPath}`);
              return {
                name: subItem,
                type: fs.lstatSync(subItemPath).isDirectory()
                  ? 'folder'
                  : 'file',
              };
            }),
          }),
        };
      });
      return res.status(200).json(items);
    } else {
      console.error('Directory not found or is not a directory');
      return res.status(404).json({ message: 'Invalid directory path' });
    }
  } catch (error) {
    console.error('Error reading directory:', error);
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});
app.delete('/delete', (req, res) => {
  const { name, parent } = req.body;
  const targetPath = path.join(ROOT_DIR, parent ? parent : '', name);

  console.log(`Attempting to delete: ${targetPath}`);

  try {
    if (fs.existsSync(targetPath)) {
      if (fs.lstatSync(targetPath).isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        return res.status(200).json({ message: 'Directory deleted' });
      } else {
        fs.unlinkSync(targetPath);
        return res.status(200).json({ message: 'File deleted' });
      }
    } else {
      console.error(`File or directory not found at: ${targetPath}`);
      return res.status(404).json({ message: 'File or directory not found' });
    }
  } catch (error) {
    console.error('Error during deletion:', error);
    return res
      .status(500)
      .json({ message: 'Internal Server Error', error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`Server run on http://localhost:${PORT}`);
});
