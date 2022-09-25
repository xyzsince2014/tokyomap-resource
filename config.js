const auth = {
  host: process.env.AUTH_DOMAIN,
  introspectionEndpoint: `${process.env.AUTH_DOMAIN}/api/v1/introspect`
};

const protectedResource = {
  resourceId: "tokyomap-resource-dev",
  resourceSecret: "fuga"
};

const postgres = {
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
};

module.exports = {
  auth,
  protectedResource,
  postgres
};
