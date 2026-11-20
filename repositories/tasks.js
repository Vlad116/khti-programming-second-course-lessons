import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/app-error.js';

// Этап перехода с занятия 7: прежняя версия на pg лежит рядом в tasks.pg.js.
// Здесь интерфейс Repository НЕ МЕНЯЕТСЯ для Controller:
// findAll, findById, add, setCompleted, remove.
// Все SQL-запросы теперь генерируются Sequelize, а схемой управляют миграции.
export default function createTasksRepository({ sequelize, User, Task, Category, TaskCategory }) {
  const include = [
    { model: User, as: 'owner', attributes: ['id', 'displayName'] },
    { model: Category, as: 'categories', through: { attributes: [] }, attributes: ['id', 'name'] }
  ];

  // Сохраняем ПРЕЖНИЙ контракт GET/POST для frontend из занятия 7.
  function toApi(instance) {
    if (!instance) return null;
    const data = instance.toJSON();
    const categories = (data.categories ?? [])
      .map(category => ({ id: category.id, name: category.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return {
      id: data.id,
      title: data.title,
      completed: data.completed,
      priority: data.priority,
      studentId: data.studentId,
      ownerId: data.ownerId,
      ownerName: data.owner?.displayName ?? null,
      parentId: data.parentId,
      createdAt: data.createdAt,
      categories
    };
  }

  async function findAll({ ownerId = null, completed = null } = {}) {
    const where = {};
    if (ownerId !== null) where.ownerId = ownerId;
    if (completed !== null) where.completed = completed;
    const rows = await Task.findAll({
      where,
      include,
      order: [['createdAt', 'DESC'], ['id', 'ASC']]
    });
    return rows.map(toApi);
  }

  async function findById(id) {
    const task = await Task.findByPk(id, { include });
    return toApi(task);
  }

  async function resolveOwner(task, transaction) {
    if (task.ownerId) {
      const owner = await User.findByPk(task.ownerId, { transaction });
      if (!owner) throw new AppError(400, 'INVALID_OWNER', 'Владелец не найден');
      return owner;
    }
    // Контракт занятия 6/7: клиент может передать studentId вместо ownerId.
    // Это всего лишь учебная метка; она НЕ служит аутентификацией.
    const legacyStudentId = task.studentId;
    const [owner] = await User.findOrCreate({
      where: { legacyStudentId },
      defaults: { id: randomUUID(), displayName: legacyStudentId },
      transaction
    });
    return owner;
  }

  async function add(task) {
    // managed transaction: COMMIT при успехе, ROLLBACK при исключении.
    // ВАЖНО: каждый ORM-запрос внутри получает один и тот же transaction.
    await sequelize.transaction(async transaction => {
      const owner = await resolveOwner(task, transaction);
      await Task.create({
        id: task.id,
        title: task.title,
        completed: false,
        priority: task.priority ?? 'medium',
        studentId: owner.legacyStudentId ?? owner.id,
        ownerId: owner.id,
        parentId: task.parentId ?? null
      }, { transaction });

      // Ошибка FOREIGN KEY при несуществующей категории откатит и Task.create.
      if ((task.categoryIds ?? []).length > 0) {
        await TaskCategory.bulkCreate(
          task.categoryIds.map(categoryId => ({ taskId: task.id, categoryId })),
          { transaction }
        );
      }
    });
    // После COMMIT возвращаем готовый объект с именем владельца и категориями.
    return findById(task.id);
  }

  async function setCompleted(id, completed) {
    const [changed] = await Task.update({ completed }, { where: { id } });
    return changed ? findById(id) : null;
  }

  async function remove(id) {
    return (await Task.destroy({ where: { id } })) > 0;
  }

  return { findAll, findById, add, setCompleted, remove };
}
