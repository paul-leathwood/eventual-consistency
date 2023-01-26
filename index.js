const { Model } = require('objection');
const Knex = require('knex');

// Initialize knex.
const knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: ':memory:'
});

Model.knex(knex);

async function createSchema() {
  if (await knex.schema.hasTable('aggregated')) {
    return;
  }

  // Create database schema. You should use knex migration files
  // to do this. We create it here for simplicity.
  await knex.schema.createTable('aggregated', table => {
    table.increments('id').primary();
    table.integer('value');
    table.integer('version');
  });
}

class Aggretated extends Model {
  static get tableName() {
    return 'aggregated';
  }
}

async function addValue (id, newValue) {
  const currentState = await Aggretated.query().findById(id)
  const rowsAffected = await Aggretated.query()
    .update({ value: currentState.value + newValue, version: currentState.version + 1 })
    .where('id', '=', id)
    .where('version', '=', currentState.version);
  console.log('rowsAffected:', rowsAffected);
  if (rowsAffected === 0) {
    return addValue(id, newValue);
  }
}

async function main() {
  const { id } = await Aggretated.query().insert({ value: 10, version: 1 });

  await Promise.all([
    addValue(id, 10),
    addValue(id, 10),
    addValue(id, 10)
  ]);

  const { value } = await Aggretated.query().findById(id);
  console.log('value: ', value);
}

createSchema()
  .then(() => main())
  .then(() => knex.destroy())
  .catch(err => {
    console.error(err);
    return knex.destroy();
  });

