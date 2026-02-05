/**
 * Controlador de imágenes para tareas y subtareas.
 * @module controladores/imageController
 */

const path = require('path');
const fs = require('fs/promises');
const { validationResult } = require('express-validator');
const {
    Image,
    Task,
    Subtask,
    Column,
    Board,
} = require('../configuraciones/initModels');
const {
    buildImageFolder,
    buildFileName,
    ensureDir,
    buildPublicUrl,
    isMimeAllowed,
    normalizePath,
} = require('../servicios/imageStorage');

const handleValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formatted = errors.array().map((error) => ({
            campo: error.param,
            mensaje: error.msg,
        }));
        const err = new Error('Solicitud inválida');
        err.status = 400;
        err.details = formatted;
        throw err;
    }
};

const ensureTaskInProject = async (projectId, taskId) => {
    const task = await Task.findByPk(taskId, {
        include: [
            {
                model: Column,
                as: 'column',
                include: [
                    {
                        model: Board,
                        as: 'board',
                        attributes: ['id', 'name'],
                    },
                ],
            },
        ],
    });

    if (!task || task.column?.board?.id !== projectId) {
        const error = new Error('Tarea no encontrada en el proyecto indicado.');
        error.status = 404;
        throw error;
    }

    return task;
};

const ensureSubtaskInTask = async (projectId, taskId, subtaskId) => {
    const subtask = await Subtask.findByPk(subtaskId, {
        include: [
            {
                model: Task,
                as: 'task',
                attributes: ['id', 'title'],
                include: [
                    {
                        model: Column,
                        as: 'column',
                        include: [
                            {
                                model: Board,
                                as: 'board',
                                attributes: ['id', 'name'],
                            },
                        ],
                    },
                ],
            },
        ],
    });

    if (!subtask || subtask.task?.id !== taskId || subtask.task?.column?.board?.id !== projectId) {
        const error = new Error('Subtarea no encontrada en el proyecto indicado.');
        error.status = 404;
        throw error;
    }

    return subtask;
};

const saveImages = async ({
    req,
    projectId,
    taskId,
    subtaskId,
    projectName,
    taskName,
    subtaskName,
    entityType,
    entityId,
}) => {
    const files = req.files || [];
    if (!files.length) {
        const error = new Error('Debes enviar al menos una imagen.');
        error.status = 400;
        throw error;
    }

    const baseFolder = buildImageFolder({
        projectId,
        taskId,
        subtaskId,
        projectName,
        taskName,
        subtaskName,
    });
    const publicRoot = path.join(__dirname, '..', '..', 'public', 'img');
    const absoluteFolder = path.join(publicRoot, baseFolder);

    await ensureDir(absoluteFolder);

    const saved = [];

    for (const file of files) {
        if (!isMimeAllowed(file.mimetype)) {
            const error = new Error('Formato de imagen no permitido.');
            error.status = 400;
            throw error;
        }

        const fileName = buildFileName(file.originalname);
        const absolutePath = path.join(absoluteFolder, fileName);
        await fs.writeFile(absolutePath, file.buffer);

        const storagePath = normalizePath(path.join(baseFolder, fileName));
        const imageUrl = buildPublicUrl(req, storagePath);

        const record = await Image.create({
            entityType,
            entityId,
            imageName: file.originalname,
            imageUrl,
            storagePath,
            uploadedBy: req.user.id,
        });

        saved.push(record);
    }

    return saved;
};

const uploadTaskImages = async (req, res) => {
    try {
        handleValidation(req);
        const { projectId, taskId } = req.params;

        const task = await ensureTaskInProject(projectId, taskId);

        const saved = await saveImages({
            req,
            projectId,
            taskId,
            projectName: task.column?.board?.name,
            taskName: task.title,
            entityType: 'TASK',
            entityId: taskId,
        });

        return res.status(201).json({
            mensaje: 'Imágenes subidas correctamente.',
            images: saved,
        });
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible subir las imágenes.',
            ...payload,
        });
    }
};

const uploadSubtaskImages = async (req, res) => {
    try {
        handleValidation(req);
        const { projectId, taskId, subtaskId } = req.params;

        const subtask = await ensureSubtaskInTask(projectId, taskId, subtaskId);

        const saved = await saveImages({
            req,
            projectId,
            taskId,
            subtaskId,
            projectName: subtask.task?.column?.board?.name,
            taskName: subtask.task?.title,
            subtaskName: subtask.title,
            entityType: 'SUBTASK',
            entityId: subtaskId,
        });

        return res.status(201).json({
            mensaje: 'Imágenes subidas correctamente.',
            images: saved,
        });
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible subir las imágenes.',
            ...payload,
        });
    }
};

const deleteImage = async (req, res) => {
    try {
        handleValidation(req);
        const { imageId } = req.params;

        const image = await Image.findByPk(imageId);
        if (!image) {
            return res.status(404).json({ mensaje: 'Imagen no encontrada.' });
        }

        const publicRoot = path.join(__dirname, '..', '..', 'public', 'img');
        const absolutePath = path.join(publicRoot, image.storagePath);

        try {
            await fs.unlink(absolutePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                return res.status(500).json({
                    mensaje: 'No fue posible eliminar la imagen del disco.',
                    error: error.message,
                });
            }
        }

        await image.destroy();

        return res.json({
            mensaje: 'Imagen eliminada correctamente.',
        });
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible eliminar la imagen.',
            ...payload,
        });
    }
};

const listTaskImages = async (req, res) => {
    try {
        handleValidation(req);
        const { projectId, taskId } = req.params;

        await ensureTaskInProject(projectId, taskId);

        const images = await Image.findAll({
            where: { entityType: 'TASK', entityId: taskId },
            order: [['uploaded_at', 'DESC']],
        });

        return res.json(images);
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible obtener las imágenes.',
            ...payload,
        });
    }
};

const listSubtaskImages = async (req, res) => {
    try {
        handleValidation(req);
        const { projectId, taskId, subtaskId } = req.params;

        await ensureSubtaskInTask(projectId, taskId, subtaskId);

        const images = await Image.findAll({
            where: { entityType: 'SUBTASK', entityId: subtaskId },
            order: [['uploaded_at', 'DESC']],
        });

        return res.json(images);
    } catch (error) {
        const status = error.status || 500;
        const payload = error.details ? { errores: error.details } : { error: error.message };
        return res.status(status).json({
            mensaje: 'No fue posible obtener las imágenes.',
            ...payload,
        });
    }
};

module.exports = {
    uploadTaskImages,
    uploadSubtaskImages,
    deleteImage,
    listTaskImages,
    listSubtaskImages,
};
