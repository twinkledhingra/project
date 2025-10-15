import { Routes } from '@angular/router';
import { AboutUsComponent } from './dashboard/about-us/about-us.component';
import { ContactComponent } from './dashboard/contact/contact.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { Landing } from './landing/landing';
import { Home } from './dashboard/home/home';
import { Orders } from './dashboard/orders/orders';
import { Message } from './dashboard/message/message';
import { Profile } from './dashboard/profile/profile';
import { Signup } from './dashboard/signup/signup';
import { Login } from './dashboard/login/login';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'signup', component: Signup },
    { path: 'login', component: Login },
    {
        path: 'dashboard',
        component: DashboardComponent,
        children: [
            { path: 'home', component: Home },
            { path: 'about', component: AboutUsComponent },
            { path: 'contact', component: ContactComponent },
            { path: 'orders', component: Orders },
            { path: 'message', component: Message },
            { path: 'profile', component: Profile},
            { path: '', redirectTo: 'home', pathMatch: 'full' } // Default child route
        ]
    },
];
