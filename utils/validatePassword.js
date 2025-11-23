module.exports = function passwordValidation(password) {
  const errors = [];
  if (password.length < 8) errors.push("Minimum 8 characters required");
  if (!/[A-Z]/.test(password)) errors.push("At least 1 uppercase letter required");
  if (!/[a-z]/.test(password)) errors.push("At least 1 lowercase letter required");
  if (!/[0-9]/.test(password)) errors.push("At least 1 number required");
  if (!/[!@#$%^&*]/.test(password)) errors.push("At least 1 special character (!@#$%^&*) required");
  return errors;
};
