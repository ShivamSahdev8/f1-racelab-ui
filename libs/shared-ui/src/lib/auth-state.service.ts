import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  email: string;
  name: string;
  favouriteTeam: string;
}

@Injectable({ providedIn: 'root' })
export class AuthStateService {

  private userSubject = new BehaviorSubject<AuthUser | null>(null);
  private loggedInSubject = new BehaviorSubject<boolean>(false);

  user$: Observable<AuthUser | null> = this.userSubject.asObservable();
  isLoggedIn$: Observable<boolean> = this.loggedInSubject.asObservable();

  setUser(user: AuthUser): void {
    this.userSubject.next(user);
    this.loggedInSubject.next(true);
  }

  clearUser(): void {
    this.userSubject.next(null);
    this.loggedInSubject.next(false);
  }

  getUser(): AuthUser | null {
    return this.userSubject.getValue();
  }

  isLoggedIn(): boolean {
    return this.loggedInSubject.getValue();
  }
}