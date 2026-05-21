import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const account = this.accountService.accountValue;
        const isLoggedIn = account?.jwtToken;
        const isApiUrl = request.url.startsWith(environment.apiUrl);

        if (isLoggedIn && isApiUrl) {
            request = request.clone({
                setHeaders: { Authorization: `Bearer ${account.jwtToken}` }
            });
        }

        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // Only handle 401 if:
                // 1. It is a 401 error
                // 2. It is NOT the refresh-token call itself (avoids infinite loop)
                // 3. The user was actually logged in (avoids breaking public pages like reset-password)
                const isRefreshUrl = request.url.includes('refresh-token');
                const userIsLoggedIn = !!this.accountService.accountValue;

                if (error.status === 401 && !isRefreshUrl && userIsLoggedIn) {
                    return this.handle401Error(request, next);
                }

                // For public pages (reset-password, verify-email, etc.)
                // just pass the error through without redirecting
                return throwError(() => error);
            })
        );
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.accountService.refreshToken().pipe(
                switchMap((account: any) => {
                    this.isRefreshing = false;
                    this.refreshTokenSubject.next(account.jwtToken);
                    // Retry the original request with the new token
                    return next.handle(this.addToken(request, account.jwtToken));
                }),
                catchError((err) => {
                    // Refresh failed — only logout if user was logged in
                    this.isRefreshing = false;
                    if (this.accountService.accountValue) {
                        this.accountService.logout();
                    }
                    return throwError(() => err);
                })
            );
        }

        // Queue other requests until the new token arrives
        return this.refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(this.addToken(request, token)))
        );
    }

    private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
        return request.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }
}
