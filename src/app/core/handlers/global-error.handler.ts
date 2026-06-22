import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const chunkFailedMessage = /Loading chunk [\d]+ failed/;
    const dynamicImportFailedMessage = /Failed to fetch dynamically imported module/;

    if (chunkFailedMessage.test(error.message) || dynamicImportFailedMessage.test(error.message)) {
      console.warn('Chunk load failed. Refreshing page...');
      window.location.reload();
      return;
    }

    console.error('Global Error:', error);
  }
}
