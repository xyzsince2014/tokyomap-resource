const authServer = {
  host: 'http://localhost:80',
  introspectionEndpoint: 'http://localhost:80/api/v1/introspect'
};

const resource = {
  host: 'http://localhost:9002',
	resourceId: "protected-resource-1",
  resourceSecret: "protected-resource-secret-1"
};

const postgres = {
  host: 'localhost',
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
  port: 5432,
};

module.exports = {
  authServer,
  resource,
  postgres
};
