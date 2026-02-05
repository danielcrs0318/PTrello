/**
 * Helpers para almacenamiento local de imágenes.
 * @module servicios/imageStorage
 */

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const sharp = require('sharp');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

const normalizePath = (value) => value.replace(/\\/g, '/');

const slugify = (value) => {
    if (!value) return '';
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

const buildImageFolder = ({
    projectId,
    taskId,
    subtaskId,
    projectName,
    taskName,
    subtaskName,
}) => {
    const projectSlug = slugify(projectName) || 'sin-proyecto';
    const taskSlug = slugify(taskName) || 'sin-tarea';
    const subtaskSlug = slugify(subtaskName) || 'sin-subtarea';

    if (subtaskId) {
        return `projects/${projectSlug}/tasks/${taskSlug}/subtasks/${subtaskSlug}/images`;
    }
    return `projects/${projectSlug}/tasks/${taskSlug}/images`;
};

const buildFileName = (originalName) => {
    const ext = path.extname(originalName || '').toLowerCase();
    const safeExt = ext || '.png';
    return `${crypto.randomUUID()}${safeExt}`;
};

const ensureDir = async (absolutePath) => {
    await fs.mkdir(absolutePath, { recursive: true });
};

const buildPublicUrl = (req, relativePath) => {
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/img/${normalizePath(relativePath)}`;
};

const isMimeAllowed = (mimeType) => ALLOWED_MIME.has(mimeType);

const getAllowedImageExtensions = () => [...ALLOWED_EXTENSIONS];

const compressImage = async (buffer, mimeType) => {
    if (!isMimeAllowed(mimeType)) {
        return buffer;
    }

    const image = sharp(buffer).rotate();

    switch (mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            return image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        case 'image/png':
            return image.png({ quality: 80, compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
        case 'image/webp':
            return image.webp({ quality: 80 }).toBuffer();
        default:
            return buffer;
    }
};

module.exports = {
    buildImageFolder,
    buildFileName,
    ensureDir,
    buildPublicUrl,
    isMimeAllowed,
    getAllowedImageExtensions,
    compressImage,
    normalizePath,
    slugify,
};
