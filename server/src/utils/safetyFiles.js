const MAX_SAFETY_FILE_SIZE = 5 * 1024 * 1024;

function isPdfFile(file) {
  const name = String(file?.name || '').toLowerCase();
  const type = String(file?.type || '').toLowerCase();
  const data = String(file?.data || '').toLowerCase();

  return (
    type === 'application/pdf' ||
    name.endsWith('.pdf') ||
    data.startsWith('data:application/pdf')
  );
}

function sanitizeSafetyFileInput(file) {
  const name = String(file?.name || '').trim();
  const type = String(file?.type || 'application/pdf').trim() || 'application/pdf';
  const size = Number(file?.size || 0);
  const data = String(file?.data || '');

  if (!name || !size || !data) {
    throw new Error('Safety file is missing required file details.');
  }

  if (size > MAX_SAFETY_FILE_SIZE) {
    throw new Error('Safety files must be 5MB or smaller.');
  }

  if (!isPdfFile({ name, type, data })) {
    throw new Error('Safety files must be PDF files.');
  }

  return {
    name,
    type: 'application/pdf',
    size,
    data,
  };
}

function serializeSafetyFile(file, includeData = false) {
  if (!file) return null;

  const serialized = {
    id: file._id.toString(),
    _id: file._id.toString(),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    lastUsedAt: file.lastUsedAt,
  };

  if (includeData) serialized.data = file.data;
  return serialized;
}

module.exports = {
  MAX_SAFETY_FILE_SIZE,
  sanitizeSafetyFileInput,
  serializeSafetyFile,
};
