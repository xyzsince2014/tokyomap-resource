const pg = require('pg'); // todo: use Sequelize.js
const camelcaseKeys = require('camelcase-keys');
const immer = require('immer');

const config = require('./config');
const util = require('./util');

const pool = new pg.Pool(config.postgres);

pool.on('error', (err, client) => {
  throw new Error(`${util.fetchCurrentDatetimeJst()} [tUsrDao.pool] ${err}`);
});

const getUserBySub = async sub => {

  const client = await pool.connect();

  try {
    const record = (await client.query(`select * from t_usr where sub = $1`, [sub])).rows[0];
    await client.release();
    if(!record) {
      console.log(`${util.fetchCurrentDatetimeJst()} [tUsrDao.getUserBySub] no matching usr`);
      return null;
    }
    const usr = immer.produce(camelcaseKeys(record, {deep: true}), draft => {
      draft.address = JSON.parse(record.address);
      delete draft.createdAt;
    });
    console.log(`${util.fetchCurrentDatetimeJst()} [tUsrDao.getUserBySub] usr = ${JSON.stringify(usr)}`);
    return usr;

  } catch (e) {
    await client.release();
    throw new Error(`${util.fetchCurrentDatetimeJst()} [tUsrDao.getUserBySub] ${e}`);
  }
};

module.exports = {
  getUserBySub
};
