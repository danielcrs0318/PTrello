const sequelize = require('./src/configuraciones/sequelize');

async function migrate() {
    try {
        await sequelize.query(`
            IF OBJECT_ID('subtask_assignees', 'U') IS NULL
            BEGIN
                CREATE TABLE subtask_assignees (
                    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
                    subtask_id UNIQUEIDENTIFIER NOT NULL,
                    user_id UNIQUEIDENTIFIER NOT NULL,
                    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT uq_subtask_assignee UNIQUE (subtask_id, user_id)
                );

                ALTER TABLE subtask_assignees
                    ADD CONSTRAINT fk_subtask_assignees_subtask
                    FOREIGN KEY (subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE;

                ALTER TABLE subtask_assignees
                    ADD CONSTRAINT fk_subtask_assignees_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END

            IF COL_LENGTH('subtasks', 'assignee_id') IS NOT NULL
            BEGIN
                INSERT INTO subtask_assignees (subtask_id, user_id)
                SELECT s.id, s.assignee_id
                FROM subtasks s
                WHERE s.assignee_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM subtask_assignees sa
                      WHERE sa.subtask_id = s.id AND sa.user_id = s.assignee_id
                  );
            END
        `);
        console.log('Migración subtask_assignees completada.');
    } catch (error) {
        console.error('Error en migración subtask_assignees:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
