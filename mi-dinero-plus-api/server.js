const app = require('./src/app');
require('dotenv').config();
require('./src/config/db'); // Inicia la conexión a MySQL

const { startReportJobs } = require('./src/jobs/reportJobs');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  startReportJobs();
});