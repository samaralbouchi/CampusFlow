import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <h2 class="logo">🎓 CampusFlow</h2>

        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">
            <span class="ico">🏠</span> Tableau de bord
          </a>
          <a routerLink="/subjects" routerLinkActive="active">
            <span class="ico">📚</span> Matières
          </a>
          <a routerLink="/resources" routerLinkActive="active">
            <span class="ico">📁</span> Ressources
          </a>
          <a routerLink="/profile" routerLinkActive="active">
            <span class="ico">👤</span> Mon profil
          </a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="active">
              <span class="ico">🛡️</span> Administration
            </a>
          }
        </nav>

        <div class="user">
          <div class="avatar">{{ initial() }}</div>
          <div class="info">
            <strong>{{ auth.user()?.fullName }}</strong>
            <small>{{ auth.user()?.role === 'ADMIN' ? 'Administrateur' : 'Étudiant' }}</small>
          </div>
        </div>
        <button class="logout" (click)="auth.logout()">Se déconnecter</button>
      </aside>

      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .shell { display: flex; min-height: 100vh; }
    .sidebar {
      width: 240px; background: linear-gradient(180deg, #1e1b4b, #312e81); color: #fff;
      padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 1.2rem;
      position: sticky; top: 0; height: 100vh; box-sizing: border-box;
    }
    .logo { margin: 0 0 0.5rem 0.5rem; font-size: 1.25rem; }
    nav { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
    nav a {
      display: flex; align-items: center; gap: 0.7rem;
      color: #c7d2fe; text-decoration: none; padding: 0.7rem 0.9rem; border-radius: 10px;
      transition: background 0.15s;
    }
    nav a:hover { background: rgba(255, 255, 255, 0.1); }
    nav a.active { background: #4f46e5; color: #fff; font-weight: 600; }
    .ico { font-size: 1.1rem; }
    .user { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem; }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%; background: #6366f1;
      display: flex; align-items: center; justify-content: center; font-weight: 700;
    }
    .info { display: flex; flex-direction: column; min-width: 0; }
    .info strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .info small { color: #a5b4fc; }
    .logout {
      padding: 0.6rem; border: 1px solid #6366f1; background: transparent;
      color: #fff; border-radius: 10px; cursor: pointer; font: inherit;
    }
    .logout:hover { background: rgba(255, 255, 255, 0.1); }
    .content { flex: 1; padding: 2rem 2.5rem; max-width: 1200px; }
    @media (max-width: 700px) {
      .shell { flex-direction: column; }
      .sidebar { width: auto; height: auto; position: static; }
      nav { flex-direction: row; flex-wrap: wrap; }
      .content { padding: 1.2rem; }
    }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);

  initial() {
    return (this.auth.user()?.fullName ?? '?').charAt(0).toUpperCase();
  }
}