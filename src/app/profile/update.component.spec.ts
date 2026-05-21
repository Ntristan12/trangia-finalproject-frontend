import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { UpdateComponent } from './update.component';
import { AccountService, AlertService } from '@app/_services';
import { Role } from '@app/_models';

describe('UpdateComponent', () => {
  let component: UpdateComponent;
  let fixture: ComponentFixture<UpdateComponent>;

  const mockAccount = {
    id: '1',
    title: 'Mr',
    firstName: 'Clint',
    lastName: 'Capondag',
    email: 'clint@example.com',
    role: Role.User,
    jwtToken: 'fake-jwt-token'
  };

  const accountServiceMock = {
    get accountValue() {
      return mockAccount;
    },
    update: jasmine.createSpy('update').and.returnValue(of(mockAccount)),
    delete: jasmine.createSpy('delete').and.returnValue(of({}))
  };

  const alertServiceMock = {
    success: jasmine.createSpy('success'),
    error: jasmine.createSpy('error'),
    clear: jasmine.createSpy('clear')
  };

  const routerMock = {
    navigate: jasmine.createSpy('navigate')
  };

  const activatedRouteMock = {
    snapshot: {
      params: {},
      queryParams: {}
    },
    params: of({}),
    queryParams: of({})
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateComponent],
      imports: [
        ReactiveFormsModule
      ],
      providers: [
        { provide: AccountService, useValue: accountServiceMock },
        { provide: AlertService, useValue: alertServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});