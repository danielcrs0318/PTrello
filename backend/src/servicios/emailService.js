/**
 * Servicio de envío de correos electrónicos
 * Utiliza Resend para enviar notificaciones por email
 * @module servicios/emailService
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un email de notificación sobre una subtarea próxima a vencer
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.boardName - Nombre del tablero
 * @param {string} options.taskTitle - Título de la tarea
 * @param {string} options.subtaskTitle - Título de la subtarea
 * @param {Date} options.dueDate - Fecha de vencimiento
 * @returns {Promise<Object>} Resultado del envío con success y messageId o error
 */
async function sendDueDateNotification({ to, boardName, taskTitle, subtaskTitle, dueDate }) {
    try {
        const formattedDate = new Date(dueDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const data = await resend.emails.send({
            from: 'SprintFlow <onboarding@resend.dev>',
            to: [to],
            subject: `Recordatorio: Subtarea próxima a vencer - ${subtaskTitle}`,
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recordatorio de Subtarea</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">SprintFlow</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0;">Recordatorio de Subtarea</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ¡Hola! Te recordamos que tienes una subtarea próxima a vencer.
                </p>
                
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Fecha de vencimiento:</p>
                  <p style="margin: 5px 0 0 0; font-size: 18px; color: #856404;">${formattedDate}</p>
                </div>
                
                <table style="width: 100%; margin: 20px 0;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong>📋 Tablero:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      ${boardName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong>📝 Tarea:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      ${taskTitle}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong>✅ Subtarea:</strong>
                    </td>
                    <td style="padding: 10px 0;">
                      ${subtaskTitle}
                    </td>
                  </tr>
                </table>
                
                <p style="margin-top: 25px; font-size: 14px; color: #666;">
                  Ingresa a tu tablero para completar esta subtarea antes de la fecha límite.
                </p>
              </div>
              
              <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                Este es un recordatorio automático de SprintFlow.<br>
                No respondas a este correo.
              </p>
            </div>
          </body>
        </html>
      `
        });

        // Verificar si hubo un error en la respuesta
        if (data && data.error) {
            console.error('Error de Resend:', data.error.message);
            return { success: false, error: data.error.message };
        }
        
        if (data && data.data && data.data.id) {
            console.log('Email enviado con ID:', data.data.id);
            return { success: true, messageId: data.data.id };
        } else if (data && data.id) {
            console.log('Email enviado con ID:', data.id);
            return { success: true, messageId: data.id };
        } else {
            console.error('Respuesta inesperada de Resend:', data);
            return { success: false, error: 'Respuesta inesperada del servidor de email' };
        }
    } catch (error) {
        console.error('Error enviando email:', error);
        console.error('Detalles del error:', {
            message: error.message,
            name: error.name,
            statusCode: error.statusCode,
            response: error.response
        });
        return { success: false, error: error.message };
    }
}

/**
 * Envía un email de invitación a un tablero
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.boardName - Nombre del tablero
 * @param {string} options.inviterName - Nombre de quien invita
 * @param {string} options.role - Rol asignado (Editor/Lector)
 * @returns {Promise<Object>} Resultado del envío con success y messageId o error
 */
async function sendBoardInvitation({ to, boardName, inviterName, role }) {
    try {
        const data = await resend.emails.send({
            from: 'SprintFlow <onboarding@resend.dev>',
            to: [to],
            subject: `Te han invitado al tablero "${boardName}" en SprintFlow`,
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitación a Tablero</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">SprintFlow</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0;">Invitación a Tablero</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  ¡Hola! <strong>${inviterName}</strong> te ha invitado a colaborar en un tablero.
                </p>
                
                <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #1565c0;">📋 Tablero:</p>
                  <p style="margin: 5px 0 0 0; font-size: 20px; color: #1565c0;">${boardName}</p>
                </div>
                
                <table style="width: 100%; margin: 20px 0;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      <strong>👤 Invitado por:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;">
                      ${inviterName}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong>🔑 Rol asignado:</strong>
                    </td>
                    <td style="padding: 10px 0;">
                      <span style="background: ${role === 'Editor' ? '#4caf50' : '#ff9800'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${role}
                      </span>
                    </td>
                  </tr>
                </table>
                
                <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; font-weight: bold;">Permisos de ${role}:</p>
                  ${role === 'Editor' ? `
                    <ul style="margin: 0; padding-left: 20px;">
                      <li>✏️ Crear y editar tareas</li>
                      <li>🔄 Mover tareas entre columnas</li>
                      <li>📝 Agregar subtareas</li>
                      <li>👁️ Ver todo el tablero</li>
                    </ul>
                  ` : `
                    <ul style="margin: 0; padding-left: 20px;">
                      <li>👁️ Ver el tablero completo</li>
                      <li>📖 Leer tareas y comentarios</li>
                      <li>🔍 Buscar y filtrar tareas</li>
                      <li>❌ No puede editar</li>
                    </ul>
                  `}
                </div>
                
                <p style="margin-top: 25px; font-size: 14px; color: #666;">
                  Inicia sesión en SprintFlow para comenzar a colaborar en este tablero.
                </p>
              </div>
              
              <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                Este es un email automático de SprintFlow.<br>
                No respondas a este correo.
              </p>
            </div>
          </body>
        </html>
      `
        });

        console.log('✅ Email de invitación enviado:', data.id);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error('Error enviando email de invitación:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Envía un email con el resumen diario de actividad en los tableros
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.userName - Nombre del usuario
 * @param {Array} options.boardsSummary - Array con resumen de cada tablero
 * @returns {Promise<Object>} Resultado del envío con success y messageId o error
 */
async function sendDailySummary({ to, userName, boardsSummary }) {
    try {
        const today = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let boardsHtml = '';
        boardsSummary.forEach(board => {
            const totalTasks = board.completed + board.inProgress + board.pending;
            const completionPercentage = totalTasks > 0 ? Math.round((board.completed / totalTasks) * 100) : 0;
          const completedSubtasks = board.completedSubtasks || 0;
          const completedSubtasksBy = Array.isArray(board.completedSubtasksBy) ? board.completedSubtasksBy : [];
          const subtasksHtml = completedSubtasks > 0
            ? `
              <div style="margin-top: 18px; padding: 14px; background: #f7f7ff; border-radius: 8px; border: 1px solid #e4e4f7;">
                <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">
                  Subtareas completadas: <strong>${completedSubtasks}</strong>
                </div>
                <div style="font-size: 12px; color: #666; margin-bottom: 6px;">Responsables</div>
                <table style="width: 100%; border-collapse: collapse;">
                  ${completedSubtasksBy.map(item => `
                    <tr>
                      <td style="padding: 6px 0; color: #333; font-size: 13px;">${item.name}</td>
                      <td style="padding: 6px 0; text-align: right; color: #4caf50; font-weight: bold; font-size: 13px;">${item.count}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
            `
            : '';
            
            boardsHtml += `
                <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #333; font-size: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                        ${board.name}
                    </h3>
                    
                    <div style="display: table; width: 100%; margin-bottom: 15px;">
                        <div style="display: table-row;">
                            <div style="display: table-cell; width: 33.33%; padding: 10px; text-align: center; border-right: 1px solid #e0e0e0;">
                                <div style="font-size: 32px; font-weight: bold; color: #4caf50; margin-bottom: 5px;">
                                    ${board.completed}
                                </div>
                                <div style="color: #666; font-size: 14px;">Finalizadas</div>
                            </div>
                            <div style="display: table-cell; width: 33.33%; padding: 10px; text-align: center; border-right: 1px solid #e0e0e0;">
                                <div style="font-size: 32px; font-weight: bold; color: #2196f3; margin-bottom: 5px;">
                                    ${board.inProgress}
                                </div>
                                <div style="color: #666; font-size: 14px;">En progreso</div>
                            </div>
                            <div style="display: table-cell; width: 33.33%; padding: 10px; text-align: center;">
                                <div style="font-size: 32px; font-weight: bold; color: #ff9800; margin-bottom: 5px;">
                                    ${board.pending}
                                </div>
                                <div style="color: #666; font-size: 14px;">Pendientes</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: #f5f5f5; border-radius: 6px; padding: 10px; margin-top: 15px;">
                        <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Progreso del día</div>
                        <div style="background: #e0e0e0; border-radius: 10px; height: 20px; overflow: hidden;">
                            <div style="background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; width: ${completionPercentage}%; transition: width 0.3s;"></div>
                        </div>
                        <div style="text-align: right; font-size: 14px; font-weight: bold; color: #4caf50; margin-top: 5px;">
                            ${completionPercentage}% completado
                        </div>
                    </div>
                      ${subtasksHtml}
                </div>
            `;
        });

        if (boardsSummary.length === 0) {
            boardsHtml = `
                <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p style="color: #999; font-size: 16px; margin: 0;">No hay actividad registrada para hoy</p>
                </div>
            `;
        }

        const data = await resend.emails.send({
            from: 'SprintFlow <onboarding@resend.dev>',
            to: [to],
            subject: `Resumen Diario - ${today}`,
            html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Resumen Diario</title>
                  </head>
                  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px;">SprintFlow</h1>
                      <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Resumen Diario de Actividad</p>
                    </div>
                    
                    <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                      <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <p style="font-size: 16px; margin: 0 0 10px 0;">
                          Hola <strong>${userName}</strong>,
                        </p>
                        <p style="font-size: 14px; color: #666; margin: 0;">
                          Este es tu resumen de actividad del día <strong>${today}</strong>
                        </p>
                      </div>
                      
                      ${boardsHtml}
                      
                      <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                        Este es un resumen automático enviado diariamente a las 8:00 PM.<br>
                        No respondas a este correo.
                      </p>
                    </div>
                  </body>
                </html>
            `
        });

        // Verificar si hubo un error en la respuesta
        if (data && data.error) {
            console.error('Error de Resend:', data.error.message);
            return { success: false, error: data.error.message };
        }
        
        if (data && data.data && data.data.id) {
            console.log('Email de resumen enviado con ID:', data.data.id);
            return { success: true, messageId: data.data.id };
        } else if (data && data.id) {
            console.log('Email de resumen enviado con ID:', data.id);
            return { success: true, messageId: data.id };
        } else {
            console.error('Respuesta inesperada de Resend:', data);
            return { success: false, error: 'Respuesta inesperada del servidor de email' };
        }
    } catch (error) {
        console.error('Error enviando resumen diario:', error);
        console.error('Detalles del error:', {
            message: error.message,
            name: error.name,
            statusCode: error.statusCode,
            response: error.response
        });
        return { success: false, error: error.message };
    }
}

/**
 * Envía un email con el PIN de recuperación de contraseña
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Email del destinatario
 * @param {string} options.displayName - Nombre del usuario
 * @param {string} options.pin - PIN de recuperación
 * @param {number} options.expiresInMinutes - Minutos de validez del PIN
 * @returns {Promise<Object>} Resultado del envío con success y messageId o error
 */
async function sendPasswordResetPin({ to, displayName, pin, expiresInMinutes }) {
    try {
        const data = await resend.emails.send({
            from: 'SprintFlow <onboarding@resend.dev>',
            to: [to],
            subject: 'Tu PIN de recuperación de contraseña - SprintFlow',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperación de contraseña</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">SprintFlow</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0;">Recuperación de contraseña</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; margin-bottom: 20px;">
                  Hola${displayName ? ` ${displayName}` : ''}, recibimos una solicitud para restablecer tu contraseña.
                </p>
                
                <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; font-weight: bold; color: #3730a3;">Tu PIN de recuperación es:</p>
                  <p style="margin: 8px 0 0 0; font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #3730a3;">${pin}</p>
                </div>
                
                <p style="margin-top: 12px; font-size: 14px; color: #666;">
                  Este PIN vence en ${expiresInMinutes} minutos. Si no solicitaste este cambio, puedes ignorar este correo.
                </p>
              </div>
              
              <p style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
                Este es un correo automático de SprintFlow. No respondas a este mensaje.
              </p>
            </div>
          </body>
        </html>
      `
        });

        if (data && data.error) {
            console.error('Error de Resend:', data.error.message);
            return { success: false, error: data.error.message };
        }

        if (data && data.data && data.data.id) {
            return { success: true, messageId: data.data.id };
        } else if (data && data.id) {
            return { success: true, messageId: data.id };
        }

        console.error('Respuesta inesperada de Resend:', data);
        return { success: false, error: 'Respuesta inesperada del servidor de email' };
    } catch (error) {
        console.error('Error enviando PIN de recuperación:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendDueDateNotification,
    sendBoardInvitation,
  sendDailySummary,
  sendPasswordResetPin
};
