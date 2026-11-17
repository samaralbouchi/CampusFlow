import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './auth.service';

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  subjectName: string;
  fileName: string;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isPublic: boolean;
  downloads: number;
  createdAt: string;
  author: { id: string; fullName: string };
  ratingAvg: number;
  ratingCount: number;
  myRating: number | null;
  isFavorite: boolean;
}

@Injectable({ providedIn: 'root' })
export class ResourcesService {
  private readonly http = inject(HttpClient);

  common() {
    return this.http.get<Resource[]>(`${API_URL}/resources`);
  }

  mine() {
    return this.http.get<Resource[]>(`${API_URL}/resources`, { params: { mine: 'true' } });
  }

  favorites() {
    return this.http.get<Resource[]>(`${API_URL}/resources/favorites`);
  }

  upload(data: FormData) {
    return this.http.post(`${API_URL}/resources`, data);
  }

  download(id: string) {
    return this.http.get(`${API_URL}/resources/${id}/download`, { responseType: 'blob' });
  }

  rate(id: string, value: number) {
    return this.http.put(`${API_URL}/resources/${id}/rating`, { value });
  }

  toggleFavorite(id: string) {
    return this.http.post<{ favorite: boolean }>(`${API_URL}/resources/${id}/favorite`, {});
  }

  report(id: string, reason: string) {
    return this.http.post(`${API_URL}/resources/${id}/report`, { reason });
  }
}