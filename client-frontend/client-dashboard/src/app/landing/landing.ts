import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  title = 'freelancer';
  
  changeTitle() {
    if (this.title == "freelancer") this.title = 'Client';
    else this.title = 'freelancer';
  }
  
  title2 = 'View All';
  myfun(){
    this.title2 = "No More"
  }
}
