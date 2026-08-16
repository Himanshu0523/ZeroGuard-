import { TextDocument } from 'vscode-languageserver-textdocument';

export class DocumentManager {
  private documents = new Map<string, TextDocument>();

  get(uri: string): TextDocument | undefined {
    return this.documents.get(uri);
  }

  set(uri: string, document: TextDocument) {
    this.documents.set(uri, document);
  }

  delete(uri: string) {
    this.documents.delete(uri);
  }

  getAll(): TextDocument[] {
    return Array.from(this.documents.values());
  }
}
