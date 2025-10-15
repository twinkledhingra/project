import { Component } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './message.html',
  styleUrl: './message.css'
})
export class Message {

}
