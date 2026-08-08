export function notFound(req, res) {
  res.status(404).json({ message: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || '서버 오류가 발생했습니다.',
    details: err.details || undefined,
  });
}

export function createError(status, message, details) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}
