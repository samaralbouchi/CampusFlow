import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { Resource, ResourcesService } from '../../core/resources.service';

type Tab = 'common' | 'mine' | 'favorites';

@Component({
  selector: 'app-resources',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './resources.html',
  styleUrl: './resources.css',
})
export class Resources {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ResourcesService);
  readonly auth = inject(AuthService);

  readonly stars = [1, 2, 3, 4, 5];

  readonly tab = signal<Tab>('common');
  readonly items = signal<Resource[]>([]);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly error = signal('');
  readonly subjectFilter = signal('');
  readonly showForm = signal(false);
  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);

  readonly subjects = computed(() =>
    [...new Set(this.items().map((r) => r.subjectName))].sort((a, b) => a.localeCompare(b)),
  );

  readonly filtered = computed(() => {
    const f = this.subjectFilter();
    return f ? this.items().filter((r) => r.subjectName === f) : this.items();
  });

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    subjectName: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    isPublic: [false],
  });

  constructor() {
    this.load();
  }

  setTab(tab: Tab) {
    this.tab.set(tab);
    this.subjectFilter.set('');
    this.load();
  }

  load(showSpinner = true) {
    if (showSpinner) this.loading.set(true);
    const request =
      this.tab() === 'common'
        ? this.service.common()
        : this.tab() === 'mine'
          ? this.service.mine()
          : this.service.favorites();

    request.subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les ressources');
        this.loading.set(false);
      },
    });
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  submit() {
    const file = this.file();
    if (this.form.invalid || !file) return;

    const v = this.form.getRawValue();
    const data = new FormData();
    data.append('file', file);
    data.append('title', v.title);
    data.append('subjectName', v.subjectName);
    if (v.description) data.append('description', v.description);
    data.append('isPublic', String(v.isPublic));

    this.uploading.set(true);
    this.clearMessages();
    this.service.upload(data).subscribe({
      next: () => {
        this.uploading.set(false);
        this.form.reset({ title: '', subjectName: '', description: '', isPublic: false });
        this.file.set(null);
        this.showForm.set(false);
        this.message.set(v.isPublic ? 'Document partagé avec tous ✔' : 'Document ajouté à tes documents ✔');
        this.setTab(v.isPublic ? 'common' : 'mine');
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.fail(err, "Impossible d'envoyer le fichier");
      },
    });
  }

  download(r: Resource) {
    this.service.download(r.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = r.fileName;
        a.click();
        URL.revokeObjectURL(url);
        this.items.update((list) =>
          list.map((x) => (x.id === r.id ? { ...x, downloads: x.downloads + 1 } : x)),
        );
      },
      error: (err: HttpErrorResponse) => this.fail(err, 'Téléchargement impossible'),
    });
  }

  canRate(r: Resource) {
    return r.isPublic && r.author.id !== this.auth.user()?.id;
  }

  rate(r: Resource, value: number) {
    if (!this.canRate(r)) return;
    this.clearMessages();
    this.service.rate(r.id, value).subscribe({
      next: () => this.load(false),
      error: (err: HttpErrorResponse) => this.fail(err, 'Impossible de noter'),
    });
  }

  toggleFavorite(r: Resource) {
    this.clearMessages();
    this.service.toggleFavorite(r.id).subscribe({
      next: () => this.load(false),
      error: (err: HttpErrorResponse) => this.fail(err, 'Action impossible'),
    });
  }

  report(r: Resource) {
    const reason = prompt(`Pourquoi signaler « ${r.title} » ?`);
    if (!reason || reason.trim().length < 3) return;
    this.clearMessages();
    this.service.report(r.id, reason.trim()).subscribe({
      next: () => this.message.set('Signalement envoyé à l’administrateur ✔'),
      error: (err: HttpErrorResponse) => this.fail(err, 'Signalement impossible'),
    });
  }

  icon(r: Resource) {
    const n = r.fileName.toLowerCase();
    if (n.endsWith('.pdf')) return '📕';
    if (n.endsWith('.doc') || n.endsWith('.docx')) return '📘';
    if (n.endsWith('.ppt') || n.endsWith('.pptx')) return '📙';
    if (/\.(png|jpe?g)$/.test(n)) return '🖼️';
    return '📄';
  }

  private clearMessages() {
    this.message.set('');
    this.error.set('');
  }

  private fail(err: HttpErrorResponse, fallback: string) {
    const msg = err.error?.message;
    this.error.set(Array.isArray(msg) ? msg.join(', ') : (msg ?? fallback));
  }
}