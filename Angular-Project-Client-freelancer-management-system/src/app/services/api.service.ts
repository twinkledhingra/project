import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'client' | 'freelancer';
  skills?: string[];
  bio?: string;
  hourlyRate?: number;
  location?: string;
  avatar?: string;
}

export interface Project {
  _id?: string;
  title: string;
  description: string;
  budget: {
    min: number;
    max: number;
  };
  timeline: string;
  skills: string[];
  clientId: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Order {
  _id?: string;
  projectId: string;
  freelancerId: string;
  clientId: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed';
  proposal?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Message {
  _id?: string;
  senderId: string;
  receiverId: string;
  projectId?: string;
  content: string;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load user from localStorage on service initialization
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  // Authentication
  login(email: string, password: string): Observable<{ user: User; token: string }> {
    return this.http.post<{ user: User; token: string }>(`${this.baseUrl}/auth/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  register(userData: Partial<User>): Observable<{ user: User; token: string }> {
    return this.http.post<{ user: User; token: string }>(`${this.baseUrl}/auth/register`, userData).pipe(
      tap(response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Projects
  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/projects`, { headers: this.getHeaders() });
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`, { headers: this.getHeaders() });
  }

  createProject(project: Partial<Project>): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/projects`, project, { headers: this.getHeaders() });
  }

  updateProject(id: string, project: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${this.baseUrl}/projects/${id}`, project, { headers: this.getHeaders() });
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`, { headers: this.getHeaders() });
  }

  // Orders
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`, { headers: this.getHeaders() });
  }

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, order, { headers: this.getHeaders() });
  }

  updateOrder(id: string, order: Partial<Order>): Observable<Order> {
    return this.http.put<Order>(`${this.baseUrl}/orders/${id}`, order, { headers: this.getHeaders() });
  }

  // Messages
  getMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.baseUrl}/messages`, { headers: this.getHeaders() });
  }

  sendMessage(message: Partial<Message>): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/messages`, message, { headers: this.getHeaders() });
  }

  // Users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`, { headers: this.getHeaders() });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/users/${id}`, { headers: this.getHeaders() });
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, user, { headers: this.getHeaders() });
  }
}
