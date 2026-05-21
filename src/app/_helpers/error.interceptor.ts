import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            const isRefreshTokenRequest = request.url.includes('/refresh-token');

            if ([401, 403].includes(err.status) && this.accountService.accountValue && !isRefreshTokenRequest) {
                this.accountService.logout();
            }

            const error = (err && err.error && err.error.message) || err.statusText;

            // avoid logging startup refresh-token 401 when the user is not logged in
            if (!(err.status === 401 && request.url.endsWith('/accounts/refresh-token') && !this.accountService.accountValue)) {
                console.error(err);
            }

            return throwError(() => error);
        }));
    }
}
