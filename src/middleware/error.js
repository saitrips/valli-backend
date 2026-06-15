function notFound(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

function errorHandler(err, _req, res, _next) {
  console.error('[ERROR]', err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: err.errors },
    });
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Resource already exists' } });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  }

  res.status(err.status || 500).json({
    error: { code: err.code || 'INTERNAL', message: err.message || 'Internal server error' },
  });
}

module.exports = { notFound, errorHandler };
