import { Component, OnInit } from '@angular/core';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { ApiService, User, Project, Order } from '../../services/api.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  currentUser: User | null = null;
  projects: Project[] = [];
  orders: Order[] = [];
  isLoading = true;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.currentUser = this.apiService.getCurrentUser();
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Load projects and orders based on user role
    if (this.currentUser?.role === 'freelancer') {
      this.loadFreelancerData();
    } else if (this.currentUser?.role === 'client') {
      this.loadClientData();
    }
  }

  loadFreelancerData() {
    // Load available projects for freelancers
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects.filter(p => p.status === 'open');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading = false;
      }
    });

    // Load freelancer's orders
    this.apiService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  loadClientData() {
    // Load client's projects
    this.apiService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoading = false;
      }
    });

    // Load client's orders
    this.apiService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });
  }

  get activeProjects() {
    return this.projects.filter(p => p.status === 'in-progress');
  }

  get completedProjects() {
    return this.projects.filter(p => p.status === 'completed');
  }

  get pendingOrders() {
    return this.orders.filter(o => o.status === 'pending');
  }

  get approvedOrders() {
    return this.orders.filter(o => o.status === 'approved');
  }

  get totalEarnings() {
    if (this.currentUser?.role === 'freelancer') {
      return this.completedProjects.reduce((total, project) => {
        return total + (project.budget.max + project.budget.min) / 2;
      }, 0);
    }
    return 0;
  }

  get totalSpent() {
    if (this.currentUser?.role === 'client') {
      return this.completedProjects.reduce((total, project) => {
        return total + (project.budget.max + project.budget.min) / 2;
      }, 0);
    }
    return 0;
  }
}
