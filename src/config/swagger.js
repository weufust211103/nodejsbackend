// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node Auth API",
      version: "1.0.0",
      description: "Simple login/register API with roles using JWT",
    },
    servers: [
      {
        //url: "http://localhost:5000",
        url: "https://nodejsbackend-m9op.onrender.com"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Video: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            video_url: { type: 'string' },
            allow_comments: { type: 'boolean' },
            allow_download: { type: 'boolean' },
            scheduled_at: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            user_id: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js", "./index.js"], // docs from all route files
};

const swaggerSpec = swaggerJSDoc(options);

function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
