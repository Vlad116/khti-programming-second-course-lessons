import test from 'node:test';
import assert from 'node:assert/strict';
import createTasksRepository from '../repositories/tasks.js';

const OWNER = '11111111-1111-4111-8111-111111111111';
const TASK = '22222222-2222-4222-8222-222222222222';
const CATEGORY = '33333333-3333-4333-8333-333333333333';

function fakeOrm({ errorOnCategory = false } = {}) {
  const calls = [];
  const data = {
    id: TASK, title: 'Репетиция', completed: false, priority: 'high',
    studentId: 'teacher-demo', ownerId: OWNER, parentId: null,
    createdAt: new Date('2026-11-05T12:00:00.000Z'),
    owner: { displayName: 'Преподаватель' },
    categories: [{ id: CATEGORY, name: 'Учёба' }]
  };
  return {
    calls,
    sequelize: { transaction: async fn => {
      calls.push('BEGIN');
      try { const result = await fn({ id: 'transaction' }); calls.push('COMMIT'); return result; }
      catch(e) { calls.push('ROLLBACK'); throw e; }
    } },
    User: {
      async findByPk(id, options) { calls.push('FIND_OWNER'); return { id, legacyStudentId: 'teacher-demo' }; },
      async findOrCreate() { throw new Error('Not needed'); }
    },
    Task: {
      async findAll(options) { calls.push({ kind: 'FIND_ALL', options }); return [{ toJSON: () => data }]; },
      async findByPk(id, options) { calls.push('GET_BY_ID'); return { toJSON: () => data }; },
      async create(value, opts) { calls.push({kind:'CREATE_TASK', value, opts}); },
      async update() { return [1]; },
      async destroy() { return 1; }
    },
    Category: {},
    TaskCategory: { async bulkCreate(value, opts) {
      calls.push({kind:'CREATE_LINKS', value, opts});
      if(errorOnCategory) { const err = new Error('FK'); err.parent={code:'23503'};throw err; }
    } }
  };
}

test('Sequelize GET: фильтр, сортировка, прежний формат API', async () => {
  const orm = fakeOrm();
  const result = await createTasksRepository(orm).findAll({ownerId:OWNER,completed:false});
  assert.equal(result[0].ownerName, 'Преподаватель');
  assert.deepEqual(result[0].categories,[{id:CATEGORY,name:'Учёба'}]);
  assert.equal(result[0].priority,'high');
  const select = orm.calls.find(x=>x.kind==='FIND_ALL');
  assert.deepEqual(select.options.where, {ownerId:OWNER, completed:false});
  assert.deepEqual(select.options.order, [['createdAt','DESC'],['id','ASC']]);
});

test('Sequelize POST: задача и связи используют одну транзакцию', async () => {
  const orm=fakeOrm();
  const result=await createTasksRepository(orm).add({id:TASK,title:'Репетиция',ownerId:OWNER,categoryIds:[CATEGORY],priority:'high'});
  assert.equal(result.id,TASK);
  assert.deepEqual(orm.calls.filter(x=>typeof x==='string').slice(0,4), ['BEGIN','FIND_OWNER','COMMIT','GET_BY_ID']);
  const create=orm.calls.find(x=>x.kind==='CREATE_TASK');
  const links=orm.calls.find(x=>x.kind==='CREATE_LINKS');
  assert.deepEqual(create.opts.transaction,links.opts.transaction);
  assert.deepEqual(links.value,[{taskId:TASK,categoryId:CATEGORY}]);
});

test('Ошибка внешнего ключа: ROLLBACK без COMMIT', async () => {
  const orm=fakeOrm({errorOnCategory:true});
  await assert.rejects(
    ()=>createTasksRepository(orm).add({id:TASK,title:'X',ownerId:OWNER,categoryIds:[CATEGORY]}),
    error => error.parent.code==='23503'
  );
  assert.ok(orm.calls.includes('ROLLBACK'));
  assert.ok(!orm.calls.includes('COMMIT'));
});
