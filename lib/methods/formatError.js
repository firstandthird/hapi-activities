module.exports = error => {
  let errorMsg = error;

  if (error instanceof Error) {
    errorMsg = error.message || 'Undefined error message';
  }

  return errorMsg;
};
