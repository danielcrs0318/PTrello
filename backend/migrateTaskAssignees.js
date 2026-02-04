const sequelize = require('./src/configuraciones/sequelize');

async function migrate() {
    try {
        await sequelize.query(`
            IF OBJECT_ID('task_assignees', 'U') IS NULL
            BEGIN
                CREATE TABLE task_assignees (
                    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
                    task_id UNIQUEIDENTIFIER NOT NULL,
                    user_id UNIQUEIDENTIFIER NOT NULL,
                    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT uq_task_assignee UNIQUE (task_id, user_id)
                );

                ALTER TABLE task_assignees
                    ADD CONSTRAINT fk_task_assignees_task
                    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

                ALTER TABLE task_assignees
                    ADD CONSTRAINT fk_task_assignees_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            END

            IF COL_LENGTH('tasks', 'assignee_id') IS NOT NULL
            BEGIN
                INSERT INTO task_assignees (task_id, user_id)
                SELECT t.id, t.assignee_id
                FROM tasks t
                WHERE t.assignee_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM task_assignees ta
                      WHERE ta.task_id = t.id AND ta.user_id = t.assignee_id
                  );
            END
        `);
        console.log('Migración task_assignees completada.');
    } catch (error) {
        console.error('Error en migración task_assignees:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
