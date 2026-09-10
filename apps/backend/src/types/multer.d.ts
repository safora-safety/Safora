declare module "multer" {
  interface StorageEngine {
    _handleFile(
      req: any,
      file: any,
      callback: (error?: any, info?: any) => void,
    ): void;
    _removeFile(
      req: any,
      file: any,
      callback: (error: Error | null) => void,
    ): void;
  }

  interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?: (
      req: any,
      file: any,
      callback: (error: Error | null, acceptFile?: boolean) => void,
    ) => void;
  }

  interface Instance {
    single(fieldName: string): import("express").RequestHandler;
    array(
      fieldName: string,
      maxCount?: number,
    ): import("express").RequestHandler;
    fields(
      fields: { name: string; maxCount?: number }[],
    ): import("express").RequestHandler;
    none(): import("express").RequestHandler;
    any(): import("express").RequestHandler;
  }

  function multer(options?: Options): Instance;

  namespace multer {
    function memoryStorage(): StorageEngine;
    function diskStorage(options?: any): StorageEngine;
  }

  export = multer;
}
