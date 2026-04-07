export class CorruptedFileError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'CorruptedFileError'
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly mime: string, public readonly ext: string) {
    super(`Tipo de archivo no soportado: ${mime} (${ext})`)
    this.name = 'UnsupportedFileTypeError'
  }
}
