// Deprecated: external object storage is removed. This stub prevents accidental imports.
export class ObjectStorageService {
  constructor() {
    throw new Error('ObjectStorageService has been removed. Use local filesystem storage.');
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
  }
}

export default ObjectStorageService;