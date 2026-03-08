import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from './user-service/user';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    if (this.userService.isLoggedInSubject.getValue() === false) {
      const isAuthenticated = await this.userService.checkAuth();
      if (!isAuthenticated) {
        this.router.navigate(['/signup']);
        return false;
      }
      return true;
    }

    const isAuthenticated = await this.userService.checkAuth();
    if (!isAuthenticated) {
      this.router.navigate(['/signup']);
      return false;
    }
    return true;
  }
}
