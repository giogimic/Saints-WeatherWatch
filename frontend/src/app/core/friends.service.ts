import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Friend {
  id: string;
  friendId: string;
  chaserName: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private readonly http = inject(HttpClient);

  listFriends(): Observable<Friend[]> {
    return this.http.get<Friend[]>('/api/friends');
  }

  addFriend(chaserName: string): Observable<Friend> {
    return this.http.post<Friend>('/api/friends', { chaserName });
  }

  removeFriend(friendshipId: string): Observable<void> {
    return this.http.delete<void>(`/api/friends/${friendshipId}`);
  }
}
