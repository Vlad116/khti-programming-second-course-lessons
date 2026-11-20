// Конкретная миграция для существующей tasks из занятия 7.
// Файл CommonJS: sequelize-cli v6 загружает up/down через require().
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('tasks', 'priority', {
        type: Sequelize.STRING(6),
        allowNull: false,
        defaultValue: 'medium'
      }, { transaction });
      await queryInterface.sequelize.query(
        "ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check " +
        "CHECK (priority IN ('low', 'medium', 'high'))",
        { transaction }
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeConstraint('tasks', 'tasks_priority_check', { transaction });
      await queryInterface.removeColumn('tasks', 'priority', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
