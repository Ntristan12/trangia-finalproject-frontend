import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Account } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({ providedIn: 'root' })
export class AccountService {
    private accountSubject: BehaviorSubject<Account | null>;
    public account: Observable<Account | null>;
    private refreshTokenTimeout?: ReturnType<typeof setTimeout>;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        this.accountSubject = new BehaviorSubject<Account | null>(null);
        this.account = this.accountSubject.asObservable();
    }

    public get accountValue(): Account | null {
        return this.accountSubject.value;
    }

    login(email: string, password: string): Observable<Account> {
        return this.http.post<Account>(`${baseUrl}/authenticate`, { email, password }, { withCredentials: true })
            .pipe(map((account: Account) => {
                this.accountSubject.next(account);
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    logout(): void {
        this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true }).subscribe();
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        this.router.navigate(['/account/login']);
    }

    refreshToken(): Observable<Account> {
        return this.http.post<Account>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map((account: Account) => {
                this.accountSubject.next(account);
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    register(account: Account): Observable<any> {
        return this.http.post(`${baseUrl}/register`, account);
    }

    verifyEmail(token: string): Observable<any> {
        return this.http.post(`${baseUrl}/verify-email`, { token });
    }

    forgotPassword(email: string): Observable<any> {
        return this.http.post(`${baseUrl}/forgot-password`, { email });
    }

    validateResetToken(token: string): Observable<any> {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token });
    }

    resetPassword(token: string, password: string, confirmPassword: string): Observable<any> {
        return this.http.post(`${baseUrl}/reset-password`, { token, password, confirmPassword });
    }

    getAll(): Observable<Account[]> {
        return this.http.get<Account[]>(baseUrl);
    }

    getById(id: string): Observable<Account> {
        return this.http.get<Account>(`${baseUrl}/${id}`);
    }

    create(params: any): Observable<any> {
        return this.http.post(baseUrl, params);
    }

    update(id: string, params: any): Observable<Account> {
        return this.http.put<Account>(`${baseUrl}/${id}`, params)
            .pipe(map((account: Account) => {
                if (account.id === this.accountValue?.id) {
                    account = { ...this.accountValue, ...account };
                    this.accountSubject.next(account);
                }
                return account;
            }));
    }

    delete(id: string): Observable<any> {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(finalize(() => {
                if (id === this.accountValue?.id) {
                    this.logout();
                }
            }));
    }

    private startRefreshTokenTimer(): void {
        const jwtToken = this.accountValue?.jwtToken;
        if (!jwtToken) {
            return;
        }

        const base64Url = jwtToken.split('.')[1];
        if (!base64Url) {
            return;
        }

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const parsedToken = JSON.parse(atob(base64));
        const expires = new Date(parsedToken.exp * 1000);
        const timeout = expires.getTime() - Date.now() - 60_000;

        if (timeout <= 0) {
            return;
        }

        this.stopRefreshTokenTimer();
        this.refreshTokenTimeout = window.setTimeout(() => this.refreshToken().subscribe(), timeout);
    }

    private stopRefreshTokenTimer(): void {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
    }
}
