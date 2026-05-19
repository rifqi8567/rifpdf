declare module 'qpdf-wasm' {
  type QpdfInitOptions = {
    locateFile?: (path: string) => string;
    print?: (message: string) => void;
    printErr?: (message: string) => void;
  };

  const initQpdf: (options?: QpdfInitOptions) => Promise<unknown>;
  export default initQpdf;
}
