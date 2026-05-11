const AWS = require('aws-sdk');

// Configuración para usar IAM role de EC2
const region = process.env.AWS_REGION || 'us-east-1';

// Usar la cadena de credenciales por defecto con el endpoint de IMDSv2
const credentials = new AWS.RemoteCredentials({
  httpOptions: { timeout: 5000 },
  maxRetries: 3
});

AWS.config.update({
  region,
  credentials
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLES = {
  PROJECTS: process.env.DYNAMO_PROJECTS_TABLE || 'sla-reporter-projects',
  TEAMS: process.env.DYNAMO_TEAMS_TABLE || 'sla-reporter-teams'
};

module.exports = { dynamodb, TABLES };
