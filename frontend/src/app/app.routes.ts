import { Routes } from '@angular/router';
import { Register } from './register/register';
import { Login } from './login/login';
import { Signup } from './signup/signup';
import { AuthGuard } from './auth.guard';
import { Chat } from './chat/chat';
import { Study } from './study/study';

export const routes: Routes = [
  { path: '', redirectTo: 'signup', pathMatch: 'full' },
  {
    path: 'signup',
    component: Signup,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'register',
        component: Register,
      },
      {
        path: 'login',
        component: Login,
      },
    ],
  },
  {
    path: 'chat',
    component: Chat,
    canActivate: [AuthGuard],
  },
  {
    path: 'study',
    component: Study,
    canActivate: [AuthGuard],
  },
];
