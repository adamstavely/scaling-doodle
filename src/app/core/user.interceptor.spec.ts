import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideApiConfiguration } from '../api/generated/api-configuration';
import { Session } from './session';
import { userInterceptor } from './user.interceptor';

describe('userInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([userInterceptor])),
        provideHttpClientTesting(),
        provideApiConfiguration('/api'),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('sends the chief by default', () => {
    http.get('/api/topics').subscribe();
    expect(backend.expectOne('/api/topics').request.headers.get('X-Intellect-User')).toBe('hv');
  });

  it('follows the role switch', () => {
    TestBed.inject(Session).setViewAs('pi');
    http.get('/api/topics').subscribe();
    expect(backend.expectOne('/api/topics').request.headers.get('X-Intellect-User')).toBe('mo');
  });

  it('leaves other hosts alone', () => {
    http.get('https://example.com/x').subscribe();
    expect(backend.expectOne('https://example.com/x').request.headers.has('X-Intellect-User')).toBe(false);
  });
});
