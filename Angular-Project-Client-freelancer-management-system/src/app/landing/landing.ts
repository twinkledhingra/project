import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {
  title = 'freelance';
  
  changeTitle() {
    if (this.title == "freelance") this.title = 'Client';
    else this.title = 'freelance';
  }
  
  title2 = 'View All';
  myfun(){
    this.title2 = "No More"
  }
}



