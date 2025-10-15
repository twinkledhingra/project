import { Component, OnInit } from '@angular/core';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService, User, Project, Order } from '../../services/api.service';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class Orders implements OnInit {
  currentUser: User | null = null;
  orders: Order[] = [];
  projects: Project[] = [];
  isLoading = true;
  showCreateProjectModal = false;
  showRequestModal = false;
  selectedProject: Project | null = null;

  // Forms
  projectForm: FormGroup;
  requestForm: FormGroup;

  constructor(
    private apiService: ApiService,
    private fb: FormBuilder
  ) {
    this.projectForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      budgetMin: ['', [Validators.required, Validators.min(1)]],
      budgetMax: ['', [Validators.required, Validators.min(1)]],
      timeline: ['', [Validators.required]],
      skills: ['', [Validators.required]]
    });

    this.requestForm = this.fb.group({
      proposal: ['', [Validators.required, Validators.minLength(50)]],
      estimatedHours: ['', [Validators.required, Validators.min(1)]],
      proposedRate: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.currentUser = this.apiService.getCurrentUser();
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    if (this.currentUser?.role === 'freelancer') {
      this.loadFreelancerOrders();
    } else if (this.currentUser?.role === 'client') {
      this.loadClientOrders();
    }
  }

  loadFreelancerOrders() {
    // Load freelancer's orders
    this.apiService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoading = false;
      }
    });
  }

  loadClientOrders() {
    // Load client's orders and projects
    this.apiService.getOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
      }
    });

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
  }

  // Client methods
  openCreateProjectModal() {
    this.showCreateProjectModal = true;
    this.projectForm.reset();
  }

  closeCreateProjectModal() {
    this.showCreateProjectModal = false;
  }

  createProject() {
    if (this.projectForm.valid && this.currentUser) {
      const formData = this.projectForm.value;
      const projectData: Partial<Project> = {
        title: formData.title,
        description: formData.description,
        budget: {
          min: parseFloat(formData.budgetMin),
          max: parseFloat(formData.budgetMax)
        },
        timeline: formData.timeline,
        skills: formData.skills.split(',').map((s: string) => s.trim()),
        clientId: this.currentUser._id!,
        status: 'open'
      };

      this.apiService.createProject(projectData).subscribe({
        next: (project) => {
          this.projects.unshift(project);
          this.closeCreateProjectModal();
        },
        error: (error) => {
          console.error('Error creating project:', error);
        }
      });
    }
  }

  approveOrder(order: Order) {
    const updatedOrder = { ...order, status: 'approved' as const };
    this.apiService.updateOrder(order._id!, updatedOrder).subscribe({
      next: (updated) => {
        const index = this.orders.findIndex(o => o._id === order._id);
        if (index !== -1) {
          this.orders[index] = updated;
        }
      },
      error: (error) => {
        console.error('Error approving order:', error);
      }
    });
  }

  rejectOrder(order: Order) {
    const updatedOrder = { ...order, status: 'rejected' as const };
    this.apiService.updateOrder(order._id!, updatedOrder).subscribe({
      next: (updated) => {
        const index = this.orders.findIndex(o => o._id === order._id);
        if (index !== -1) {
          this.orders[index] = updated;
        }
      },
      error: (error) => {
        console.error('Error rejecting order:', error);
      }
    });
  }

  // Freelancer methods
  openRequestModal(project: Project) {
    this.selectedProject = project;
    this.showRequestModal = true;
    this.requestForm.reset();
  }

  closeRequestModal() {
    this.showRequestModal = false;
    this.selectedProject = null;
  }

  submitRequest() {
    if (this.requestForm.valid && this.currentUser && this.selectedProject) {
      const formData = this.requestForm.value;
      const orderData: Partial<Order> = {
        projectId: this.selectedProject._id!,
        freelancerId: this.currentUser._id!,
        clientId: this.selectedProject.clientId,
        status: 'pending',
        proposal: formData.proposal
      };

      this.apiService.createOrder(orderData).subscribe({
        next: (order) => {
          this.orders.unshift(order);
          this.closeRequestModal();
        },
        error: (error) => {
          console.error('Error submitting request:', error);
        }
      });
    }
  }

  // Getters
  get pendingOrders() {
    return this.orders.filter(o => o.status === 'pending');
  }

  get approvedOrders() {
    return this.orders.filter(o => o.status === 'approved');
  }

  get inProgressOrders() {
    return this.orders.filter(o => o.status === 'in-progress');
  }

  get completedOrders() {
    return this.orders.filter(o => o.status === 'completed');
  }

  get availableProjects() {
    return this.projects.filter(p => p.status === 'open');
  }

  get isClient() {
    return this.currentUser?.role === 'client';
  }

  get isFreelancer() {
    return this.currentUser?.role === 'freelancer';
  }
}
